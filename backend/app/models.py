"""Database models: users and saved predictions."""
from datetime import datetime, timezone
 
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
 
from .database import Base
 
 
def utcnow() -> datetime:
    return datetime.now(timezone.utc)
 
 
class User(Base):
    __tablename__ = "users"
 
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="user")  # user | researcher | admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
 
    predictions: Mapped[list["Prediction"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
 
 
class Prediction(Base):
    __tablename__ = "predictions"
 
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lead_time: Mapped[int] = mapped_column(Integer)
    inputs: Mapped[dict] = mapped_column(JSON)
    predicted_class: Mapped[str] = mapped_column(String(40))
    probabilities: Mapped[dict] = mapped_column(JSON)
    contributions: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
 
    user: Mapped[User] = relationship(back_populates="predictions")

