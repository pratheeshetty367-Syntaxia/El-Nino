"""Registration, login and current-user endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session
 
from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import Token, UserCreate, UserLogin, UserOut
from ..security import create_access_token, hash_password, verify_password
 
router = APIRouter(prefix="/api/auth", tags=["auth"])
 
 
def _token_for(user: User) -> Token:
    return Token(
        access_token=create_access_token(str(user.id), user.role),
        user=UserOut.model_validate(user),
    )
 
 
def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated")
    return user
 
 
@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    is_admin = bool(settings.admin_email) and email == settings.admin_email.lower()
    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role="admin" if is_admin else "user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_for(user)
 
 
@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    return _token_for(_authenticate(db, payload.email, payload.password))
 
 
@router.post("/token", response_model=Token, include_in_schema=True)
def token_form(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Form-based login used by the Swagger 'Authorize' button."""
    return _token_for(_authenticate(db, form.username, form.password))
 
 
@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


 