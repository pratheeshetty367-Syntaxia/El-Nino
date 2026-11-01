"""Admin / researcher endpoints: users, statistics and background model training."""
from datetime import datetime, timezone
 
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
 
from ..config import settings
from ..database import get_db
from ..deps import require_admin, require_researcher
from ..models import Prediction, User
from ..schemas import UserAdminUpdate, UserOut
from ..services import dataset_service, ml_service
from ml.baselines import run_baselines
from ml.train import run_training
 
router = APIRouter(prefix="/api/admin", tags=["admin"])
 
JOBS: dict[str, dict] = {
    "train": {"status": "idle"},
    "baselines": {"status": "idle"},
}
 
 
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
 
 
def _run_job(name: str, func) -> None:
    JOBS[name] = {"status": "running", "started_at": _now()}
    try:
        func(dataset_service.require_master(), settings.artifacts_dir)
        ml_service.clear_cache()
        JOBS[name] = {"status": "completed", "finished_at": _now()}
    except Exception as exc:  # noqa: BLE001 - surfaced to the admin UI
        JOBS[name] = {"status": "failed", "finished_at": _now(), "error": str(exc)}
 
 
def _start(name: str, func, background: BackgroundTasks) -> dict:
    if JOBS[name]["status"] == "running":
        raise HTTPException(409, "This job is already running")
    try:
        dataset_service.require_master()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(400, str(exc))
    JOBS[name] = {"status": "running", "started_at": _now()}
    background.add_task(_run_job, name, func)
    return JOBS[name]
 
 
@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(require_researcher)):
    per_lead = dict(
        db.execute(select(Prediction.lead_time, func.count()).group_by(Prediction.lead_time)).all()
    )
    return {
        "users": db.scalar(select(func.count()).select_from(User)),
        "predictions": db.scalar(select(func.count()).select_from(Prediction)),
        "predictions_by_lead": {str(k): v for k, v in sorted(per_lead.items())},
        "models": ml_service.status(),
        "dataset_present": dataset_service.find_master_file() is not None,
        "jobs": JOBS,
    }
 
 
@router.get("/users", response_model=list[UserOut])
def users(db: Session = Depends(get_db), user: User = Depends(require_researcher)):
    return db.scalars(select(User).order_by(User.created_at)).all()
 
 
@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(404, "User not found")
    if target.id == admin.id and (payload.role not in (None, "admin") or payload.is_active is False):
        raise HTTPException(400, "You cannot demote or deactivate your own account")
    if payload.role is not None:
        target.role = payload.role
    if payload.is_active is not None:
        target.is_active = payload.is_active
    db.commit()
    db.refresh(target)
    return target
 
 
@router.post("/train", status_code=202)
def train(background: BackgroundTasks, admin: User = Depends(require_admin)):
    return _start("train", run_training, background)
 
 
@router.post("/baselines", status_code=202)
def baselines(background: BackgroundTasks, admin: User = Depends(require_admin)):
    return _start("baselines", run_baselines, background)
