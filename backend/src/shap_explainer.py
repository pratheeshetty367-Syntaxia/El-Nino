"""
shap_explainer.py

Wraps SHAP TreeExplainer around the trained XGBoost models to:
1. Compute overall predictor importance per lead time (matches paper's Table II)
2. Explain a single live prediction (for the app's "Live Prediction" feature)
"""

import numpy as np
import pandas as pd
import shap

from src.data_loader import load_leadtime_data
from src.model_trainer import FEATURE_COLUMNS, train_all_models


def compute_shap_importance(model_bundle: dict, lead_months: int) -> dict:
    """
    Compute mean absolute SHAP value per predictor across all 45 seasons,
    following the paper's formula in Section III-F:
        phi_bar_j = (1 / (N*K)) * sum_i sum_k |phi_ij^(k)|

    Args:
        model_bundle: dict from train_model() — {"model", "label_encoder", "feature_columns"}
        lead_months: 3, 6, 9, or 12 (used to load the matching dataset)

    Returns:
        dict mapping predictor name -> mean absolute SHAP value, e.g.
        {"sst_anom": 1.91, "ohc_anom": 0.005, ...}
    """
    model = model_bundle["model"]
    df = load_leadtime_data(lead_months)
    X = df[FEATURE_COLUMNS]

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)
    # shap_values shape for multi-class: (n_samples, n_features, n_classes)
    # or a list of (n_samples, n_features) arrays, one per class, depending on SHAP version.
    # Normalize to a single (n_samples, n_features, n_classes) array so the
    # mean-abs calculation below works regardless of which format SHAP returned.
    if isinstance(shap_values, list):
        shap_array = np.stack(shap_values, axis=-1)  # -> (n_samples, n_features, n_classes)
    else:
        shap_array = shap_values

    # Mean absolute SHAP value across samples AND classes, per feature
    mean_abs_shap = np.abs(shap_array).mean(axis=(0, 2))  # -> (n_features,)

    return dict(zip(FEATURE_COLUMNS, mean_abs_shap.tolist()))


def explain_single_prediction(model_bundle: dict, input_values: dict) -> dict:
    """
    Explain one live prediction: given predictor values, return the predicted
    class plus each feature's SHAP contribution to that specific prediction.

    Args:
        model_bundle: dict from train_model()
        input_values: dict like {"sst_anom": 1.2, "ohc_anom": 0.3, "iod_dmi": -0.1,
                                  "wind_anom": 0.05, "atl_sst_anom": 0.2}

    Returns:
        {
            "predicted_class": "Extreme-Nino",
            "class_probabilities": {"Extreme-Nino": 0.7, "Non-Nino": 0.2, "Normal-Nino": 0.1},
            "shap_contributions": {"sst_anom": 0.45, "ohc_anom": -0.02, ...}  # for predicted class
        }
    """
    model = model_bundle["model"]
    encoder = model_bundle["label_encoder"]

    # Build a single-row DataFrame in the correct column order
    X_input = pd.DataFrame([[input_values[col] for col in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)

    # Predict class + probabilities
    predicted_encoded = model.predict(X_input)[0]
    predicted_class = encoder.inverse_transform([predicted_encoded])[0]

    probabilities = model.predict_proba(X_input)[0]
    class_probabilities = {
        encoder.inverse_transform([i])[0]: float(prob)
        for i, prob in enumerate(probabilities)
    }

    # SHAP explanation for this specific input
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_input)

    if isinstance(shap_values, list):
        # shap_values[class_index] -> (1, n_features)
        contributions_for_predicted_class = shap_values[predicted_encoded][0]
    else:
        # shap_values -> (1, n_features, n_classes)
        contributions_for_predicted_class = shap_values[0, :, predicted_encoded]

    shap_contributions = dict(zip(FEATURE_COLUMNS, [float(v) for v in contributions_for_predicted_class]))

    return {
        "predicted_class": predicted_class,
        "class_probabilities": class_probabilities,
        "shap_contributions": shap_contributions,
    }


# Quick manual test
if __name__ == "__main__":
    print("Training models and computing SHAP importance...\n")
    all_models = train_all_models()

    for lead, bundle in all_models.items():
        importance = compute_shap_importance(bundle, lead)
        ranked = sorted(importance.items(), key=lambda x: x[1], reverse=True)
        print(f"Lead time {lead}m SHAP importance (ranked):")
        for feature, value in ranked:
            print(f"  {feature}: {value:.4f}")
        print()

    # Test a single prediction using the 3-month model with example values
    print("Testing single prediction explanation (3-month model)...")
    example_input = {
        "sst_anom": 1.2,
        "ohc_anom": 0.3,
        "iod_dmi": -0.1,
        "wind_anom": 0.05,
        "atl_sst_anom": 0.2,
    }
    result = explain_single_prediction(all_models[3], example_input)
    print(f"  Predicted class: {result['predicted_class']}")
    print(f"  Probabilities: { {k: round(v,3) for k,v in result['class_probabilities'].items()} }")
    print(f"  SHAP contributions: { {k: round(v,3) for k,v in result['shap_contributions'].items()} }")