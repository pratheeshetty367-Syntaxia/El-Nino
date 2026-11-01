"""Extreme El Nino prediction endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
 
from ..database import get_db
from ..deps import get_current_user
from ..models import Prediction, User
from ..schemas import PredictionOut, PredictionRequest
from ..services import ml_service
 
router = APIRouter(prefix="/api/predict", tags=["prediction"])
 
 
@router.get("/status")
def model_status(user: User = Depends(get_current_user)):
    return ml_service.status()
 
 
@router.get("/samples/{lead_time}")
def samples(lead_time: int, user: User = Depends(get_current_user)):
    """Historical lead-time samples (one per DJF season) used to pre-fill the form."""
    if lead_time not in (3, 6, 9, 12):
        raise HTTPException(422, "lead_time must be 3, 6, 9 or 12")
    return ml_service.leadtime_samples(lead_time)
 
 
@router.post("", response_model=PredictionOut, status_code=201)
def predict(req: PredictionRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        result = ml_service.predict(req.lead_time, req.features())
    except ml_service.ModelNotTrained as exc:
        raise HTTPException(503, str(exc))
    record = Prediction(
        user_id=user.id,
        lead_time=req.lead_time,
        inputs=req.features(),
        predicted_class=result.predicted_class,
        probabilities=result.probabilities,
        contributions=[c.model_dump() for c in result.contributions],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
