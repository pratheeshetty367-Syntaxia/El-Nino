

"""Shared data/label/lead-time logic for the research methodology.
 
Everything here mirrors the methodology in the paper:
  * five predictors, monthly, Jan 1980 - Apr 2025 (544 rows)
  * target from the DJF (Dec-Jan-Feb) 3-month mean of the Nino3.4 anomaly,
    assigned to the January row of each season
      Extreme El Nino  >= 2.0 C
      Normal El Nino   >= 0.5 C and < 2.0 C
      Non-Nino         <  0.5 C
  * lead-time datasets: predictors taken L months before each January
  * class weights w_i = N / (K * N_k)
  * XGBoost: 100 trees, max depth 3, learning rate 0.1, multi:softprob
"""
from __future__ import annotations
 
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier
 
FEATURES = ["sst_anom", "ohc_anom", "iod_dmi", "wind_anom", "atl_sst_anom"]
FEATURE_LABELS = {
    "sst_anom": "SST",
    "ohc_anom": "OHC",
    "iod_dmi": "IOD",
    "wind_anom": "Wind",
    "atl_sst_anom": "Atl. SST",
}
CLASS_NAMES = ["Non-Niño", "Normal El Niño", "Extreme El Niño"]
EXTREME = 2
LEAD_TIMES = [3, 6, 9, 12]
EXTREME_THRESHOLD = 2.0
NORMAL_THRESHOLD = 0.5
FIRST_SEASON_YEAR = 1981  # January 1981 (DJF 1980/81) ... January 2025 (DJF 2024/25)
RANDOM_STATE = 42
REQUIRED_COLUMNS = ["year", "month", "nino34_anom", *FEATURES]
 
 
def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Lower-case column names and replace spaces/dashes so 'Year' -> 'year'."""
    out = df.copy()
    out.columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in out.columns]
    missing = [c for c in REQUIRED_COLUMNS if c not in out.columns]
    if missing:
        raise ValueError(
            f"master dataset is missing columns {missing}. Columns found: {list(out.columns)}"
        )
    out["year"] = out["year"].astype(int)
    out["month"] = out["month"].astype(int)
    out["date"] = pd.to_datetime(dict(year=out["year"], month=out["month"], day=1))
    out = out.sort_values("date").reset_index(drop=True)
    gaps = out["date"].diff().dropna().dt.days
    if (gaps > 31).any():
        raise ValueError("master dataset has missing months; the series must be continuous")
    return out
 
 
def label_from_anomaly(value: float) -> int:
    if value >= EXTREME_THRESHOLD:
        return 2
    if value >= NORMAL_THRESHOLD:
        return 1
    return 0
 
 
def season_name(january: pd.Timestamp) -> str:
    return f"{january.year - 1}/{str(january.year)[-2:]}"
 
 
def build_season_table(df: pd.DataFrame) -> pd.DataFrame:
    """One row per labelled DJF season, indexed by its January date."""
    work = df.copy()
    # 3-month running mean centred on each month: at January this is (Dec + Jan + Feb) / 3
    work["nino34_djf"] = work["nino34_anom"].rolling(3, center=True).mean()
    jan = work[(work["month"] == 1) & (work["year"] >= FIRST_SEASON_YEAR)].copy()
    jan = jan[jan["nino34_djf"].notna()]
    jan["label"] = jan["nino34_djf"].apply(label_from_anomaly)
    jan["label_name"] = jan["label"].map(dict(enumerate(CLASS_NAMES)))
    jan["season"] = jan["date"].apply(season_name)
    return jan[["date", "season", "nino34_djf", "label", "label_name"]].reset_index(drop=True)
 
 
def build_leadtime_dataset(df: pd.DataFrame, seasons: pd.DataFrame, lead: int) -> pd.DataFrame:
    """Predictors from `lead` months before each season's January, paired with its label."""
    indexed = df.set_index("date")
    rows = []
    for _, s in seasons.iterrows():
        source_date = s["date"] - pd.DateOffset(months=lead)
        if source_date not in indexed.index:
            raise ValueError(f"No predictor data for {source_date:%Y-%m} (lead {lead} months)")
        row = indexed.loc[source_date, FEATURES].astype(float).to_dict()
        row.update(season=s["season"], label=int(s["label"]), label_name=s["label_name"])
        rows.append(row)
    return pd.DataFrame(rows)
 
 
def sample_weights(y) -> np.ndarray:
    """Equation (1): w_i = N / (K * N_k)."""
    y = np.asarray(y)
    classes, counts = np.unique(y, return_counts=True)
    n, k = len(y), len(classes)
    weight_for = {c: n / (k * cnt) for c, cnt in zip(classes, counts)}
    return np.array([weight_for[v] for v in y], dtype=float)
 
 
def make_xgb() -> XGBClassifier:
    return XGBClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.1,
        objective="multi:softprob",
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=1,
    )
 
 
def shap_to_array(shap_values) -> np.ndarray:
    """Normalise SHAP output (list of arrays or 3-D array) to shape (samples, features, classes)."""
    if isinstance(shap_values, list):
        return np.stack([np.asarray(s) for s in shap_values], axis=-1)
    return np.asarray(shap_values)
 
 
def evaluate(y_true, y_pred, season_names) -> dict:
    """Accuracy plus recall / precision for the Extreme El Nino class."""
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    is_true, is_pred = y_true == EXTREME, y_pred == EXTREME
    tp = int((is_true & is_pred).sum())
    fp = int((~is_true & is_pred).sum())
    fn = int((is_true & ~is_pred).sum())
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "recall": tp / (tp + fn) if (tp + fn) else 0.0,
        "precision": tp / (tp + fp) if (tp + fp) else 0.0,
        "extreme_detected": [season_names[i] for i in np.where(is_true & is_pred)[0]],
    }

