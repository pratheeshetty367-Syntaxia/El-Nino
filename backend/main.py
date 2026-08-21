from contextlib import asynccontextmanager
from pathlib import Path

import pandas as pd
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from src.data_loader import (
    load_master_dataset,
    load_shap_importance,
    load_case_study,
    load_model_comparison,
)
from src.model_trainer import train_all_models
from src.shap_explainer import compute_shap_importance, explain_single_prediction

ASSETS_DIR = Path(__file__).resolve().parent / "assets"

trained_models: dict = {}


def clean_for_json(df):
    """
    Convert a DataFrame to a list of JSON-safe dicts, with NaN properly
    converted to null (via pandas' own to_json, which handles this
    correctly — unlike replace()/where(), which pandas silently undoes
    on numeric columns).
    """
    return json.loads(df.to_json(orient="records"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Training models at startup...")
    trained_models.update(train_all_models())
    print(f"Ready — trained models for lead times: {list(trained_models.keys())}")
    yield
    trained_models.clear()


app = FastAPI(title="El Nino Prediction API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"status": "Backend is running", "models_loaded": list(trained_models.keys())}

@app.get("/dashboard-data")
def get_dashboard_data():
    shap_importance_precomputed = clean_for_json(load_shap_importance())
    case_study = clean_for_json(load_case_study())
    model_comparison = clean_for_json(load_model_comparison())

    live_shap_importance = {
        lead: compute_shap_importance(bundle, lead)
        for lead, bundle in trained_models.items()
    }

    return {
        "shap_importance_table": shap_importance_precomputed,
        "case_study": case_study,
        "model_comparison": model_comparison,
        "live_shap_importance": live_shap_importance,
    }


@app.get("/shap-plot/{lead_months}")
def get_shap_plot(lead_months: int):
    if lead_months not in (3, 6, 9, 12):
        raise HTTPException(status_code=400, detail="lead_months must be 3, 6, 9, or 12")

    file_path = ASSETS_DIR / f"shap_{lead_months}m.png"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Plot not found: {file_path.name}")

    return FileResponse(file_path, media_type="image/png")


class PredictionInput(BaseModel):
    lead_months: int
    sst_anom: float
    ohc_anom: float
    iod_dmi: float
    wind_anom: float
    atl_sst_anom: float


@app.post("/predict")
def predict(input_data: PredictionInput):
    if input_data.lead_months not in trained_models:
        raise HTTPException(
            status_code=400,
            detail=f"lead_months must be one of {list(trained_models.keys())}",
        )

    model_bundle = trained_models[input_data.lead_months]

    input_values = {
        "sst_anom": input_data.sst_anom,
        "ohc_anom": input_data.ohc_anom,
        "iod_dmi": input_data.iod_dmi,
        "wind_anom": input_data.wind_anom,
        "atl_sst_anom": input_data.atl_sst_anom,
    }

    result = explain_single_prediction(model_bundle, input_values)
    return result