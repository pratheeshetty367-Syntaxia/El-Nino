"""Research results: values transcribed from the paper and results computed by this app."""
import json
 
from fastapi import APIRouter, Depends
 
from ..config import settings
from ..deps import get_current_user
from ..models import User
from ..services import ml_service
 
router = APIRouter(prefix="/api/research", tags=["research"])
 
 
@router.get("/published")
def published(user: User = Depends(get_current_user)):
    """Tables I-V of the paper, exactly as published."""
    with open(settings.published_results_file, encoding="utf-8") as fh:
        return json.load(fh)
 
 
@router.get("/computed")
def computed(user: User = Depends(get_current_user)):
    """Results produced by `python -m ml.train` / `python -m ml.baselines` on the local dataset."""
    return {
        "training": ml_service.read_json_artifact("training_results.json"),
        "baselines": ml_service.read_json_artifact("baseline_results.json"),
    }
