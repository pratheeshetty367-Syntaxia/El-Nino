"""Shared FastAPI dependencies: current user and role checks."""
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
 
from .database import get_db
from .models import User
from .security import decode_token
 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")
 
 
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise credentials_error
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_error
    return user
 
 
def require_researcher(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("researcher", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Researcher or admin access required")
    return user
 
 
def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user

