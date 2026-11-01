"""Load trained models and produce predictions with SHAP explanations."""
from __future__ import annotations
 
import json
from pathlib import Path
 
import joblib
import numpy as np
import pandas as pd
import shap
 
from ..config import settings
from ..schemas import Contribution, PredictionResult
from ml.pipeline import CLASS_NAMES, EXTREME, FEATURE_LABELS, FEATURES, LEAD_TIMES, shap_to_array
 
 
class ModelNotTrained(Exception):
    pass
 
 
_models: dict[int, object] = {}
_explainers: dict[int, shap.TreeExplainer] = {}
 
 
def _artifact(name: str) -> Path:
    return Path(settings.artifacts_dir) / name
 
 
def clear_cache() -> None:
    _models.clear()
    _explainers.clear()
 
 
def _load(lead: int):
    if lead not in _models:
        path = _artifact(f"model_{lead}m.joblib")
        if not path.exists():
            raise ModelNotTrained(
                f"The {lead}-month model has not been trained yet. "
                "Run `python -m ml.train` or ask an admin to start training."
            )
        _models[lead] = joblib.load(path)
        _explainers[lead] = shap.TreeExplainer(_models[lead])
    return _models[lead], _explainers[lead]
 
 
def status() -> dict:
    return {
        "models": [{"lead_time": lead, "ready": _artifact(f"model_{lead}m.joblib").exists()} for lead in LEAD_TIMES],
        "training_results": _artifact("training_results.json").exists(),
        "baseline_results": _artifact("baseline_results.json").exists(),
    }
 
 
def read_json_artifact(name: str):
    path = _artifact(name)
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)
 
 
def leadtime_samples(lead: int) -> list[dict]:
    path = _artifact(f"leadtime_{lead}m.csv")
    if not path.exists():
        return []
    df = pd.read_csv(path)
    return json.loads(df.to_json(orient="records"))
 
 
def predict(lead: int, features: dict[str, float]) -> PredictionResult:
    model, explainer = _load(lead)
    X = pd.DataFrame([[features[f] for f in FEATURES]], columns=FEATURES)
    proba = model.predict_proba(X)[0]
    predicted = int(np.argmax(proba))
 
    sv = shap_to_array(explainer.shap_values(X))[0]  # (features, classes)
    contributions = [
        Contribution(
            feature=name,
            label=FEATURE_LABELS[name],
            value=float(features[name]),
            shap_extreme=float(sv[i, EXTREME]),
            shap_predicted=float(sv[i, predicted]),
        )
        for i, name in enumerate(FEATURES)
    ]
    return PredictionResult(
        predicted_class=CLASS_NAMES[predicted],
        probabilities={CLASS_NAMES[i]: float(p) for i, p in enumerate(proba)},
        contributions=contributions,
    )
