from typing import List, Optional
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    access_token_cookie: Optional[str] = Cookie(default=None, alias="access_token"),
    db: Session = Depends(get_db)
) -> User:
    """
    Decodes JWT bearer token and retrieves authenticated User ORM model from database.
    Raises HTTP 401 Unauthorized if token is invalid or user does not exist.

    Issue #60: also verifies the token's 'ver' claim against the user's current
    token_version. A bumped token_version (role change, password reset, forced
    logout) invalidates ALL previously issued tokens immediately.
    Issue #65: accepts the token from the Authorization header (API clients) OR
    from the httpOnly 'access_token' cookie (browser clients). Header wins when
    both are present.
    """
    # Header takes precedence; fall back to the httpOnly cookie
    token = token or access_token_cookie
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_ver = payload.get("ver", 0)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception

    # Issue #60: revocation check — stale tokens from before a token_version bump
    if token_ver != user.token_version:
        raise credentials_exception

    return user


class RoleChecker:
    """
    FastAPI dependency factory enforcing server-side Role-Based Access Control (RBAC).
    Usage: Depends(RoleChecker(["Admin", "Analyst"]))
    """

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized to access this resource. Allowed roles: {self.allowed_roles}"
            )
        return current_user


def require_roles(allowed_roles: List[str]):
    return RoleChecker(allowed_roles)
