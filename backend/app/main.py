"""FastAPI application entry point.  Run:  uvicorn app.main:app --reload"""
from contextlib import asynccontextmanager
 
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
 
from . import models  # noqa: F401  (register tables)
from .config import settings
from .database import Base, engine
import importlib

admin = importlib.import_module(".routers.admin", package=__package__)
auth = importlib.import_module(".routers.auth", package=__package__)
dataset = importlib.import_module(".routers.dataset", package=__package__)
history = importlib.import_module(".routers.history", package=__package__)
predict_module = importlib.import_module(".routers.predict", package=__package__)
research = importlib.import_module(".routers.research", package=__package__) 
 
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    settings.artifacts_dir.mkdir(parents=True, exist_ok=True)
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    yield
 
 
app = FastAPI(
    title="Extreme El Niño Explainable Prediction API",
    description="XGBoost + SHAP lead-time analysis of oceanic predictors for Extreme El Niño classification.",
    version="1.0.0",
    lifespan=lifespan,
)
from fastapi.middleware.cors import CORSMiddleware


 
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
for module in (
    auth,
    predict_module,
    history,
    research,
    dataset,
    admin,
):
    app.include_router(module.router) 
 
@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok"}

