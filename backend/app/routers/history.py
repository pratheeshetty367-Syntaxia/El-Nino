"""Prediction history for the signed-in user."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
 
from ..database import get_db
from ..deps import get_current_user
from ..models import Prediction, User
from ..schemas import PredictionOut
 
router = APIRouter(prefix="/api/history", tags=["history"])
 
 
@router.get("")
def list_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = db.scalar(select(func.count()).select_from(Prediction).where(Prediction.user_id == user.id))
    rows = db.scalars(
        select(Prediction)
        .where(Prediction.user_id == user.id)
        .order_by(Prediction.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return {"total": total, "items": [PredictionOut.model_validate(r) for r in rows]}
 
 
@router.delete("/{prediction_id}", status_code=204)
def delete_prediction(prediction_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = db.get(Prediction, prediction_id)
    if record is None or record.user_id != user.id:
        raise HTTPException(404, "Prediction not found")
    db.delete(record)
    db.commit()

