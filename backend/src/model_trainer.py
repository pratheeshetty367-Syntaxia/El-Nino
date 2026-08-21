"""
model_trainer.py

Recreates the XGBoost training pipeline from Section III-E of the paper:
- Sample weighting to handle class imbalance (Non-Nino / Normal-Nino / Extreme-Nino)
- XGBoost classifier trained on all 45 seasons per lead time
- One model per lead time (3, 6, 9, 12 months)

Note: The paper uses LOOCV for *evaluation* (to report accuracy/precision/recall
on unseen folds). For the live app, we don't need to re-run LOOCV every time —
we just need a final model trained on all 45 samples per lead time, which is
exactly what the paper does in Section III-F before running SHAP. That's what
these functions produce.
"""

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.preprocessing import LabelEncoder

from src.data_loader import load_master_dataset
from src.data_processor import generate_lead_time_dataset

# The 5 predictor columns used as model input, in a fixed order.
# Keeping this as a shared constant avoids typos/mismatches across files.
FEATURE_COLUMNS = ["sst_anom", "ohc_anom", "iod_dmi", "wind_anom", "atl_sst_anom"]


def compute_sample_weights(y: pd.Series) -> np.ndarray:
    """
    Compute per-sample weights to correct class imbalance, following the
    paper's formula:  w_i = N / (K * N_k)

    where:
        N  = total number of samples
        K  = number of classes
        N_k = number of samples belonging to sample i's class

    Args:
        y: Series of class labels (e.g. "Non-Nino", "Normal-Nino", "Extreme-Nino")

    Returns:
        NumPy array of weights, same length and order as y.
    """
    N = len(y)
    K = y.nunique()
    class_counts = y.value_counts()  # e.g. {"Non-Nino": 30, "Normal-Nino": 12, "Extreme-Nino": 3}

    weights = y.map(lambda label: N / (K * class_counts[label]))
    return weights.to_numpy()


def train_model(lead_months: int) -> dict:
    """
    Train an XGBoost classifier for a given forecast lead time, using the
    exact hyperparameters and weighting strategy from the paper.

    Args:
        lead_months: one of 3, 6, 9, 12

    Returns:
        A dict containing everything needed to use this model later:
        {
            "model": trained XGBClassifier,
            "label_encoder": fitted LabelEncoder (numeric <-> text label mapping),
            "feature_columns": list of the 5 predictor column names, in order
        }
    """
    master_df = load_master_dataset()
    df = generate_lead_time_dataset(master_df, lead_months)

    X = df[FEATURE_COLUMNS]
    y_text = df["Target"]  # e.g. "Non-Nino", "Normal-Nino", "Extreme-Nino"

    # XGBoost requires numeric class labels, not strings.
    # LabelEncoder learns a mapping like {"Extreme-Nino": 0, "Non-Nino": 1, "Normal-Nino": 2}
    # (alphabetical by default) and remembers it, so we can convert predictions
    # back to readable text labels later.
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y_text)

    sample_weights = compute_sample_weights(y_text)

    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.1,
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",   # silences an XGBoost warning about default metric
        random_state=42,          # ensures reproducible training runs
    )

    model.fit(X, y_encoded, sample_weight=sample_weights)

    return {
        "model": model,
        "label_encoder": label_encoder,
        "feature_columns": FEATURE_COLUMNS,
    }


def train_all_models() -> dict:
    """
    Train one model per lead time.

    Returns:
        {
            3:  {"model": ..., "label_encoder": ..., "feature_columns": [...]},
            6:  {...},
            9:  {...},
            12: {...},
        }
    """
    return {lead: train_model(lead) for lead in (3, 6, 9, 12)}


# Quick manual test
if __name__ == "__main__":
    print("Training all models...\n")
    all_models = train_all_models()

    for lead, bundle in all_models.items():
        model = bundle["model"]
        encoder = bundle["label_encoder"]
        print(f"Lead time {lead}m -> trained OK")
        print(f"  Classes: {list(encoder.classes_)}")
        print(f"  Feature importances: {dict(zip(FEATURE_COLUMNS, model.feature_importances_.round(3)))}")

    print("\nAll models trained successfully.")