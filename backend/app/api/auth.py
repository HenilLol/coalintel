from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.rbac import get_current_user, require_roles
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse


router = APIRouter(tags=["Authentication"])

# ============================================================================
# Login Rate Limiting (Issue #55)
# ============================================================================
# In-process sliding-window limiter for auth endpoints. Tracks failed attempts
# per (username, client IP). Locks the combination for LOCKOUT_MINUTES after
# MAX_FAILED_ATTEMPTS failures within WINDOW_MINUTES. Successful login clears
# the record. NOTE: per-process only — a multi-worker deployment should move
# this to shared storage (Redis) or a reverse-proxy limiter; for the single-node
# SIH deployment profile this closes the brute-force/credential-stuffing hole.
import time
from collections import defaultdict
from threading import Lock

MAX_FAILED_ATTEMPTS = 5
WINDOW_MINUTES = 15
LOCKOUT_MINUTES = 15
WINDOW_SECONDS = WINDOW_MINUTES * 60
LOCKOUT_SECONDS = LOCKOUT_MINUTES * 60

_failed_attempts: dict = defaultdict(list)  # key -> [timestamps of failures]
_rate_limit_lock = Lock()


def _client_key(payload_username: str, request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")
    return f"{payload_username.strip().lower()}|{client_ip}"


def _is_rate_limited(key: str) -> int:
    """Returns seconds remaining in lockout, or 0 if not locked out."""
    now = time.monotonic()
    with _rate_limit_lock:
        attempts = _failed_attempts.get(key, [])
        if len(attempts) >= MAX_FAILED_ATTEMPTS and (now - attempts[-1]) < LOCKOUT_SECONDS:
            return int(LOCKOUT_SECONDS - (now - attempts[-1]))
    return 0


def _record_failure(key: str) -> None:
    now = time.monotonic()
    with _rate_limit_lock:
        attempts = _failed_attempts[key]
        attempts.append(now)
        # Drop attempts outside the sliding window
        _failed_attempts[key] = [t for t in attempts if now - t < WINDOW_SECONDS]


def _clear_failures(key: str) -> None:
    with _rate_limit_lock:
        _failed_attempts.pop(key, None)


# Constant-time password check baseline (Issue #55): when the username does not
# exist we still burn an equivalent bcrypt verification against a fixed dummy
# hash so response timing does not reveal whether the account exists.
_DUMMY_BCRYPT_HASH = get_password_hash("timing-equalization-dummy-password")


@router.post("/auth/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    OAuth2 Username & Password Authentication Endpoint.
    Verifies bcrypt password hash against PostgreSQL users table, issues JWT bearer token,
    and writes event to immutable audit log.

    Security (Issue #55):
    - Rate limited: 5 failed attempts per (username, IP) per 15 min -> 15 min lockout.
    - Constant-time: bcrypt verification runs even when the user does not exist.
    """
    rl_key = _client_key(payload.username, request)

    lockout_remaining = _is_rate_limited(rl_key)
    if lockout_remaining > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Try again in {max(1, lockout_remaining // 60)} minute(s).",
            headers={"Retry-After": str(max(1, lockout_remaining))},
        )

    user = db.query(User).filter(User.username == payload.username).first()

    # Constant-time path: always run bcrypt, even for unknown usernames
    stored_hash = user.hashed_password if user else _DUMMY_BCRYPT_HASH
    password_ok = verify_password(payload.password, stored_hash)

    if not user or not password_ok:
        _record_failure(rl_key)
        # Log failed login attempt (username existence is not revealed to the client)
        failed_audit = AuditLog(
            user_id=user.id if user else None,
            action="LOGIN_FAILED",
            details=f"Failed login attempt for username: '{payload.username}'"
        )
        db.add(failed_audit)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _clear_failures(rl_key)

    # Generate JWT Bearer Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.username,
        role=user.role,
        subsidiary=user.subsidiary or "CIL HQ",
        expires_delta=access_token_expires,
        token_version=user.token_version  # Issue #60: bind token to revocation epoch
    )

    # Log successful login event
    success_audit = AuditLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        details=f"User '{user.username}' (Role: {user.role}, Subsidiary: {user.subsidiary}) authenticated successfully."
    )
    db.add(success_audit)
    db.commit()

    # Issue #65: also set the token as an httpOnly cookie so browser clients
    # (the frontend) never need to persist it in localStorage where XSS could
    # steal it. Non-browser API clients keep using the Authorization header
    # with the token from the response body.
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax",
        path="/",
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignupRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Public User Registration Endpoint.
    Enforces safe non-privileged role ('Analyst'), hashes password with bcrypt,
    checks for unique username/email, writes audit log, and issues JWT bearer token.
    """
    cleaned_username = payload.username.strip() if payload.username else ""
    if not cleaned_username or len(cleaned_username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long."
        )
    if not payload.password or len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # Check for existing username
    existing_user = db.query(User).filter(User.username == cleaned_username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already registered."
        )

    # Check for existing email if provided
    cleaned_email = payload.email.strip() if payload.email and payload.email.strip() else None
    if cleaned_email:
        existing_email = db.query(User).filter(User.email == cleaned_email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered."
            )

    # Hash password safely
    hashed_pwd = get_password_hash(payload.password)

    # Create new user with safe non-privileged role ('Analyst')
    new_user = User(
        username=cleaned_username,
        hashed_password=hashed_pwd,
        role="Analyst",  # Enforce non-privileged role for public registration
        subsidiary=payload.subsidiary.strip() if payload.subsidiary and payload.subsidiary.strip() else "CIL HQ",
        full_name=payload.full_name.strip() if payload.full_name and payload.full_name.strip() else None,
        email=cleaned_email
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Record registration audit log
    audit_entry = AuditLog(
        user_id=new_user.id,
        action="USER_SIGNUP",
        details=f"New user registered: '{new_user.username}' (Role: {new_user.role}, Subsidiary: {new_user.subsidiary})"
    )
    db.add(audit_entry)
    db.commit()

    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=new_user.username,
        role=new_user.role,
        subsidiary=new_user.subsidiary or "CIL HQ",
        expires_delta=access_token_expires,
        token_version=new_user.token_version  # Issue #60
    )

    # Issue #65: httpOnly cookie for browser clients (see login)
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax",
        path="/",
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile information for currently authenticated user."""
    return UserResponse.model_validate(current_user)


# ============================================================================
# Admin User Management (Issue #60)
# ============================================================================

VALID_ROLES = {"Admin", "Analyst", "Reviewer", "Viewer"}


@router.get("/auth/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin"]))
):
    """Lists all user accounts (Admin only)."""
    return [UserResponse.model_validate(u) for u in db.query(User).order_by(User.id).all()]


@router.post("/auth/users/{username}/revoke-tokens", response_model=UserResponse)
def revoke_user_tokens(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin"]))
):
    """
    Invalidates ALL outstanding JWTs for a user immediately (Admin only).
    Issue #60: bumps token_version; every previously issued token fails the
    'ver' check in get_current_user on its next request.
    """
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{username}' not found.")

    target.token_version = (target.token_version or 0) + 1
    db.add(AuditLog(
        user_id=current_user.id,
        action="USER_TOKENS_REVOKED",
        resource_type="User",
        resource_id=target.id,
        details=f"Admin '{current_user.username}' revoked all tokens for '{target.username}'."
    ))
    db.commit()
    db.refresh(target)
    return UserResponse.model_validate(target)


@router.post("/auth/users/{username}/role", response_model=UserResponse)
def change_user_role(
    username: str,
    new_role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["Admin"]))
):
    """
    Changes a user's role (Admin only). Issue #60: also bumps token_version so
    the demoted/promoted user cannot keep using tokens issued under the old role
    window.
    """
    new_role = (new_role or "").strip().title()
    if new_role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{new_role}'. Valid roles: {sorted(VALID_ROLES)}"
        )
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{username}' not found.")
    if target.username == current_user.username and new_role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot demote their own account."
        )

    old_role = target.role
    target.role = new_role
    target.token_version = (target.token_version or 0) + 1  # revoke outstanding tokens
    db.add(AuditLog(
        user_id=current_user.id,
        action="USER_ROLE_CHANGED",
        resource_type="User",
        resource_id=target.id,
        details=f"Admin '{current_user.username}' changed role of '{target.username}': {old_role} -> {new_role}. All prior tokens revoked."
    ))
    db.commit()
    db.refresh(target)
    return UserResponse.model_validate(target)


@router.post("/auth/logout")
def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Issue #65: server-side logout. Clears the httpOnly access_token cookie and
    records a LOGOUT audit event. The client should ALSO discard any token it
    holds (API clients) — cookies are cleared here.
    """
    response.delete_cookie(key="access_token", path="/")
    db.add(AuditLog(
        user_id=current_user.id,
        action="LOGOUT",
        details=f"User '{current_user.username}' logged out."
    ))
    db.commit()
    return {"detail": "Logged out successfully"}

