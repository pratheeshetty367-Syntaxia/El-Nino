"""
data_loader.py

Handles loading all CSV data files used by the El Niño prediction project:
- Lead-time datasets (3/6/9/12 month) used for model training
- The full master dataset (monthly raw records)
- Precomputed result tables (SHAP importance, case study, model comparison)
  that back the dashboard.
"""

from pathlib import Path
import pandas as pd

# Resolve the path to the data/ folder relative to THIS file's location,
# not relative to wherever uvicorn happens to be launched from.
# __file__ = .../backend/src/data_loader.py
# .parent          -> .../backend/src
# .parent.parent   -> .../backend
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_leadtime_data(lead_months: int) -> pd.DataFrame:
    """
    Load the lead-time dataset for a given forecast horizon.

    Args:
        lead_months: one of 3, 6, 9, 12

    Returns:
        DataFrame with columns:
        target_year, lead_months, predictor_date, sst_anom, ohc_anom,
        iod_dmi, wind_anom, atl_sst_anom, nino34_anom, Target
    """
    if lead_months not in (3, 6, 9, 12):
        raise ValueError(f"lead_months must be 3, 6, 9, or 12 — got {lead_months}")

    file_path = DATA_DIR / f"leadtime_{lead_months}m.csv"
    return pd.read_csv(file_path)


def load_master_dataset() -> pd.DataFrame:
    """
    Load the full monthly master dataset (Jan 1980 - Apr 2025).

    Returns:
        DataFrame with columns:
        Year, Month, sst_anom, ohc_anom, iod_dmi, wind_anom, atl_sst_anom,
        nino34_anom, Target, oni_anom, enso_phase
        Note: Target/nino34_anom are only populated on January (DJF-label) rows.
    """
    file_path = DATA_DIR / "master_dataset.csv"
    return pd.read_csv(file_path)


def load_shap_importance() -> pd.DataFrame:
    """
    Load precomputed SHAP predictor importance rankings across all lead times.

    Returns:
        DataFrame with columns:
        Predictor, Rank_3m, Rank_6m, Rank_9m, Rank_12m,
        SHAP_3m, SHAP_6m, SHAP_9m, SHAP_12m
    """
    file_path = DATA_DIR / "shap_importance_results.csv"
    return pd.read_csv(file_path)


def load_case_study() -> pd.DataFrame:
    """
    Load per-event SHAP case study results (1982/83, 1997/98, 2015/16).

    Returns:
        DataFrame with columns:
        lead_months, event, predictor_date, predictor, shap_value, percentage
    """
    file_path = DATA_DIR / "case_study_results.csv"
    return pd.read_csv(file_path)


def load_model_comparison() -> pd.DataFrame:
    """
    Load the comparison of XGBoost vs other classifiers across lead times.

    Returns:
        DataFrame with columns:
        Lead Time, Model, Accuracy, Extreme Recall, Extreme Precision,
        Extreme Events Detected
    """
    file_path = DATA_DIR / "model_comparison_results.csv"
    return pd.read_csv(file_path)


# Quick manual test — run this file directly to sanity-check all loaders work
if __name__ == "__main__":
    print("Testing loaders...\n")

    for lead in (3, 6, 9, 12):
        df = load_leadtime_data(lead)
        print(f"leadtime_{lead}m.csv -> {df.shape[0]} rows, {df.shape[1]} cols")

    master = load_master_dataset()
    print(f"master_dataset.csv -> {master.shape[0]} rows, {master.shape[1]} cols")

    shap_imp = load_shap_importance()
    print(f"shap_importance_results.csv -> {shap_imp.shape[0]} rows, {shap_imp.shape[1]} cols")

    case_study = load_case_study()
    print(f"case_study_results.csv -> {case_study.shape[0]} rows, {case_study.shape[1]} cols")

    model_comp = load_model_comparison()
    print(f"model_comparison_results.csv -> {model_comp.shape[0]} rows, {model_comp.shape[1]} cols")

    print("\nAll loaders ran successfully.")