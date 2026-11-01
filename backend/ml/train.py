"""Train the lead-time XGBoost models exactly as described in the paper.
 
For each lead time (3, 6, 9, 12 months):
  1. build the 45-season lead-time dataset
  2. evaluate with Leave-One-Out CV (train on 44 seasons, test on 1, repeated 45 times)
     using class weights w_i = N / (K * N_k) computed on each training fold
  3. train a final model on all 45 seasons and save it
  4. compute SHAP TreeExplainer values -> mean |SHAP| per predictor (equation 2)
  5. compute event-level SHAP shares for the Extreme El Nino seasons
 
Run from the backend folder:   python -m ml.train
"""
from __future__ import annotations
 
import json
from datetime import datetime, timezone
from pathlib import Path
 
import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.model_selection import LeaveOneOut
 
from .pipeline import (
    CLASS_NAMES,
    EXTREME,
    FEATURES,
    LEAD_TIMES,
    build_leadtime_dataset,
    build_season_table,
    evaluate,
    make_xgb,
    normalise_columns,
    sample_weights,
    shap_to_array,
)
 
 
def loocv_predict(X: pd.DataFrame, y: np.ndarray) -> np.ndarray:
    predictions = np.zeros(len(y), dtype=int)
    for train_idx, test_idx in LeaveOneOut().split(X):
        model = make_xgb()
        model.fit(X.iloc[train_idx], y[train_idx], sample_weight=sample_weights(y[train_idx]))
        predictions[test_idx] = model.predict(X.iloc[test_idx])
    return predictions
 
 
def run_training(master: pd.DataFrame, artifacts_dir: Path) -> dict:
    artifacts_dir = Path(artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)
 
    df = normalise_columns(master)
    seasons = build_season_table(df)
    class_counts = {name: int((seasons["label"] == i).sum()) for i, name in enumerate(CLASS_NAMES)}
    extreme_seasons = seasons.loc[seasons["label"] == EXTREME, "season"].tolist()
 
    results = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_monthly_records": int(len(df)),
        "n_seasons": int(len(seasons)),
        "class_counts": class_counts,
        "extreme_seasons": extreme_seasons,
        "leads": {},
    }
 
    for lead in LEAD_TIMES:
        data = build_leadtime_dataset(df, seasons, lead)
        X, y = data[FEATURES], data["label"].to_numpy()
        names = data["season"].tolist()
 
        # --- LOOCV evaluation -------------------------------------------------
        loocv_pred = loocv_predict(X, y)
        metrics = evaluate(y, loocv_pred, names)
 
        # --- final model on all 45 seasons -----------------------------------
        final_model = make_xgb()
        final_model.fit(X, y, sample_weight=sample_weights(y))
        joblib.dump(final_model, artifacts_dir / f"model_{lead}m.joblib")
        data.to_csv(artifacts_dir / f"leadtime_{lead}m.csv", index=False)
 
        # --- SHAP -------------------------------------------------------------
        explainer = shap.TreeExplainer(final_model)
        sv = shap_to_array(explainer.shap_values(X))  # (samples, features, classes)
        mean_abs = np.abs(sv).mean(axis=(0, 2))  # equation (2)
        ranking = np.argsort(-mean_abs)
        shap_mean_abs = {FEATURES[i]: float(mean_abs[i]) for i in range(len(FEATURES))}
        shap_rank = {FEATURES[i]: int(r + 1) for r, i in enumerate(ranking)}
 
        events = {}
        for idx in np.where(y == EXTREME)[0]:
            per_feature = np.abs(sv[idx]).mean(axis=1)
            shares = per_feature / per_feature.sum() * 100.0
            top = int(np.argmax(shares))
            events[names[idx]] = {
                "dominant": FEATURES[top],
                "share": float(shares[top]),
                "shares": {FEATURES[i]: float(shares[i]) for i in range(len(FEATURES))},
            }
 
        results["leads"][str(lead)] = {
            **metrics,
            "shap_mean_abs": shap_mean_abs,
            "shap_rank": shap_rank,
            "events": events,
        }
 
    with open(artifacts_dir / "training_results.json", "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=2, ensure_ascii=False)
    return results
 
 
def main() -> None:
    from app.config import settings
    from app.services import dataset_service
 
    master = dataset_service.require_master()
    results = run_training(master, settings.artifacts_dir)
    print(f"Seasons: {results['n_seasons']}  class counts: {results['class_counts']}")
    for lead, res in results["leads"].items():
        print(
            f"{lead:>2} months  acc={res['accuracy']:.3f}  recall={res['recall']:.2f}  "
            f"precision={res['precision']:.2f}  detected={res['extreme_detected']}"
        )
    print(f"Artifacts written to {settings.artifacts_dir}")
 
 
if __name__ == "__main__":
    main()

