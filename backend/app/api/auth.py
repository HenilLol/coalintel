from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.security import verify_password, create_access_token
from app.core.rbac import get_current_user
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse

router = APIRouter(tags=["Authentication"])


@router.post("/auth/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    OAuth2 Username & Password Authentication Endpoint.
    Verifies bcrypt password hash against PostgreSQL users table, issues JWT bearer token,
    and writes event to immutable audit log.
    """
    user = db.query(User).filter(User.username == payload.username).first()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        # Log failed login attempt
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

    # Generate JWT Bearer Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.username,
        role=user.role,
        subsidiary=user.subsidiary or "CIL HQ",
        expires_delta=access_token_expires
    )

    # Log successful login event
    success_audit = AuditLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        details=f"User '{user.username}' (Role: {user.role}, Subsidiary: {user.subsidiary}) authenticated successfully."
    )
    db.add(success_audit)
    db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile information for currently authenticated user."""
    return UserResponse.model_validate(current_user)
