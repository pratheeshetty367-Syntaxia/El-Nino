"""LOOCV comparison of XGBoost with five alternative classifiers (paper Section IV-F).
 
All models use the same five predictors, the same sample weights (equation 1) and
the same Leave-One-Out procedure. The paper does not list hyper-parameters for the
baselines, so the values below are reasonable defaults - edit MODEL_FACTORIES to
change them.
 
Run from the backend folder:   python -m ml.baselines
"""
from __future__ import annotations
 
import json
from datetime import datetime, timezone
from pathlib import Path
 
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import LeaveOneOut
from sklearn.svm import SVC
 
from .pipeline import (
    FEATURES,
    LEAD_TIMES,
    RANDOM_STATE,
    build_leadtime_dataset,
    build_season_table,
    evaluate,
    make_xgb,
    normalise_columns,
    sample_weights,
)
 
MODEL_FACTORIES = {
    "XGBoost": make_xgb,
    "Random Forest": lambda: RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE),
    "Logistic Regression": lambda: LogisticRegression(max_iter=2000),
    "SVM": lambda: SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE),
    "LightGBM": lambda: LGBMClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.1, random_state=RANDOM_STATE, verbose=-1
    ),
    "CatBoost": lambda: CatBoostClassifier(
        iterations=100, depth=3, learning_rate=0.1, random_seed=RANDOM_STATE, verbose=0
    ),
}
 
 
def loocv_predict(factory, X: pd.DataFrame, y: np.ndarray) -> np.ndarray:
    predictions = np.zeros(len(y), dtype=int)
    for train_idx, test_idx in LeaveOneOut().split(X):
        model = factory()
        model.fit(X.iloc[train_idx], y[train_idx], sample_weight=sample_weights(y[train_idx]))
        predictions[test_idx] = np.asarray(model.predict(X.iloc[test_idx])).ravel().astype(int)
    return predictions
 
 
def run_baselines(master: pd.DataFrame, artifacts_dir: Path) -> dict:
    artifacts_dir = Path(artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    df = normalise_columns(master)
    seasons = build_season_table(df)
 
    results = {"generated_at": datetime.now(timezone.utc).isoformat(), "leads": {}}
    for lead in LEAD_TIMES:
        data = build_leadtime_dataset(df, seasons, lead)
        X, y = data[FEATURES], data["label"].to_numpy()
        names = data["season"].tolist()
        rows = []
        for model_name, factory in MODEL_FACTORIES.items():
            metrics = evaluate(y, loocv_predict(factory, X, y), names)
            rows.append(
                {
                    "model": model_name,
                    "accuracy": metrics["accuracy"],
                    "recall": metrics["recall"],
                    "precision": metrics["precision"],
                }
            )
        results["leads"][str(lead)] = rows
 
    with open(artifacts_dir / "baseline_results.json", "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=2, ensure_ascii=False)
    return results
 
 
def main() -> None:
    from app.config import settings
    from app.services import dataset_service
 
    results = run_baselines(dataset_service.require_master(), settings.artifacts_dir)
    for lead, rows in results["leads"].items():
        print(f"--- {lead}-month lead time")
        for r in rows:
            print(f"{r['model']:<20} acc={r['accuracy']:.4f} rec={r['recall']:.4f} prec={r['precision']:.4f}")
 
 
if __name__ == "__main__":
    main()


 