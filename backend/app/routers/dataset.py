"""Dataset explorer endpoints (read-only)."""
from fastapi import APIRouter, Depends, HTTPException, Query
 
from ..deps import get_current_user
from ..models import User
from ..services import dataset_service
from ml.pipeline import build_season_table
 
router = APIRouter(prefix="/api/dataset", tags=["dataset"])
 
 
def _df():
    try:
        df = dataset_service.get_master()
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    if df is None:
        raise HTTPException(404, "master_dataset file not found in backend/data")
    return df
 
 
@router.get("/summary")
def summary(user: User = Depends(get_current_user)):
    return dataset_service.summary(_df())
 
 
@router.get("/rows")
def rows(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=200),
    year_from: int | None = None,
    year_to: int | None = None,
    user: User = Depends(get_current_user),
):
    df = _df()
    if year_from is not None:
        df = df[df["year"] >= year_from]
    if year_to is not None:
        df = df[df["year"] <= year_to]
    page = df.drop(columns=["date"]).iloc[skip : skip + limit]
    return {"total": int(len(df)), "rows": dataset_service.records(page)}
 
 
@router.get("/seasons")
def seasons(user: User = Depends(get_current_user)):
    table = build_season_table(_df())
    return dataset_service.records(table.drop(columns=["date"]))
