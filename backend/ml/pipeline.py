
"""
Shared data, label, and lead-time logic for the research methodology.

Expected data:
- Five predictors, monthly, January 1980 to April 2025 (544 rows)
- Target from the DJF (December-January-February) three-month mean
  of the Nino3.4 anomaly, assigned to the January row of each season
- Extreme El Niño: >= 2.0 C
- Normal El Niño: >= 0.5 C and < 2.0 C
- Non-Niño: < 0.5 C
- Lead-time datasets: predictors taken L months before each January
- Class weights: w_i = N / (K * N_k)
- XGBoost: 100 trees, max depth 3, learning rate 0.1
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier


FEATURES = [
    "sst_anom",
    "ohc_anom",
    "iod_dmi",
    "wind_anom",
    "atl_sst_anom",
]

FEATURE_LABELS = {
    "sst_anom": "SST",
    "ohc_anom": "OHC",
    "iod_dmi": "IOD",
    "wind_anom": "Wind",
    "atl_sst_anom": "Atl. SST",
}

CLASS_NAMES = [
    "Non-Niño",
    "Normal El Niño",
    "Extreme El Niño",
]

EXTREME = 2
LEAD_TIMES = [3, 6, 9, 12]

EXTREME_THRESHOLD = 2.0
NORMAL_THRESHOLD = 0.5

FIRST_SEASON_YEAR = 1981
RANDOM_STATE = 42

REQUIRED_COLUMNS = [
    "year",
    "month",
    "nino34_anom",
    *FEATURES,
]


def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalise column names, parse dates, and check monthly continuity."""
    out = df.copy()

    out.columns = [
        str(column)
        .strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
        for column in out.columns
    ]

    missing = [
        column
        for column in REQUIRED_COLUMNS
        if column not in out.columns
    ]

    if missing:
        raise ValueError(
            f"Master dataset is missing columns {missing}. "
            f"Columns found: {list(out.columns)}"
        )

    out["year"] = pd.to_numeric(
        out["year"], errors="raise"
    ).astype(int)

    out["month"] = pd.to_numeric(
        out["month"], errors="raise"
    ).astype(int)

    if not out["month"].between(1, 12).all():
        raise ValueError("Month values must be between 1 and 12.")

    out["date"] = pd.to_datetime(
        dict(
            year=out["year"],
            month=out["month"],
            day=1,
        )
    )

    out = (
        out.sort_values("date")
        .drop_duplicates(subset=["date"])
        .reset_index(drop=True)
    )

    # Check actual month-to-month continuity rather than relying
    # on the number of days between dates.
    expected_dates = pd.date_range(
        start=out["date"].min(),
        end=out["date"].max(),
        freq="MS",
    )

    if not out["date"].reset_index(drop=True).equals(
        pd.Series(expected_dates, name="date")
    ):
        raise ValueError(
            "The master dataset has missing or duplicate months. "
            "The monthly series must be continuous."
        )

    numeric_columns = [
        "nino34_anom",
        *FEATURES,
    ]

    for column in numeric_columns:
        out[column] = pd.to_numeric(
            out[column], errors="coerce"
        )

    return out


def label_from_anomaly(value: float) -> int:
    """Convert an anomaly value into a three-class label."""
    if pd.isna(value):
        raise ValueError(
            "Cannot assign a class label to a missing anomaly."
        )

    if value >= EXTREME_THRESHOLD:
        return 2

    if value >= NORMAL_THRESHOLD:
        return 1

    return 0


def season_name(january: pd.Timestamp) -> str:
    """Format January 1981 as the 1980/81 season."""
    return f"{january.year - 1}/{str(january.year)[-2:]}"


def build_season_table(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build one row per labelled DJF season.

    Prefer the actual monthly Nino3.4 anomaly. If it is missing,
    use ONI only when that column exists and contains a value.

    IMPORTANT:
    ONI and Nino3.4 anomaly are not automatically interchangeable.
    Verify the dataset definitions before research use.
    """
    work = df.copy()

    work["nino34_anom"] = pd.to_numeric(
        work["nino34_anom"], errors="coerce"
    )

    if "oni_anom" in work.columns:
        work["oni_anom"] = pd.to_numeric(
            work["oni_anom"], errors="coerce"
        )

        # Fallback for missing Nino3.4 values.
        # Remove this fallback once the source data is corrected.
        work["nino34_for_label"] = (
            work["nino34_anom"]
            .fillna(work["oni_anom"])
        )
    else:
        work["nino34_for_label"] = work["nino34_anom"]

    # The rolling mean at January uses December, January, and February.
    work["nino34_djf"] = (
        work["nino34_for_label"]
        .rolling(window=3, center=True, min_periods=3)
        .mean()
    )

    jan = work[
        (work["month"] == 1)
        & (work["year"] >= FIRST_SEASON_YEAR)
    ].copy()

    jan = jan[jan["nino34_djf"].notna()].copy()

    jan["label"] = jan["nino34_djf"].apply(
        label_from_anomaly
    )

    jan["label_name"] = jan["label"].map(
        dict(enumerate(CLASS_NAMES))
    )

    jan["season"] = jan["date"].apply(season_name)

    return jan[
        [
            "date",
            "season",
            "nino34_djf",
            "label",
            "label_name",
        ]
    ].reset_index(drop=True)


def build_leadtime_dataset(
    df: pd.DataFrame,
    seasons: pd.DataFrame,
    lead: int,
) -> pd.DataFrame:
    """
    Pair each season's label with predictors from `lead` months
    before that season's January.
    """
    if lead < 0:
        raise ValueError("Lead time must be non-negative.")

    indexed = df.set_index("date")
    rows = []

    for _, season_row in seasons.iterrows():
        source_date = (
            season_row["date"]
            - pd.DateOffset(months=lead)
        )

        if source_date not in indexed.index:
            raise ValueError(
                f"No predictor data for {source_date:%Y-%m} "
                f"(lead {lead} months)."
            )

        features = indexed.loc[source_date, FEATURES]

        if isinstance(features, pd.DataFrame):
            raise ValueError(
                f"Multiple records found for {source_date:%Y-%m}."
            )

        if features.isna().any():
            missing_features = features[
                features.isna()
            ].index.tolist()

            raise ValueError(
                f"Missing predictor values for "
                f"{source_date:%Y-%m}: {missing_features}"
            )

        row = features.astype(float).to_dict()

        row.update(
            {
                "season": season_row["season"],
                "label": int(season_row["label"]),
                "label_name": season_row["label_name"],
            }
        )

        rows.append(row)

    return pd.DataFrame(rows)


def sample_weights(y) -> np.ndarray:
    """Calculate balanced class weights: N / (K * N_k)."""
    y = np.asarray(y)

    if len(y) == 0:
        raise ValueError("Cannot calculate weights for empty labels.")

    classes, counts = np.unique(
        y, return_counts=True
    )

    n = len(y)
    k = len(classes)

    weight_for = {
        class_id: n / (k * count)
        for class_id, count in zip(classes, counts)
    }

    return np.array(
        [weight_for[value] for value in y],
        dtype=float,
    )


def make_xgb() -> XGBClassifier:
    """Create the XGBoost multiclass classifier."""
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
    """
    Normalise SHAP output to shape:
    (samples, features, classes).
    """
    if isinstance(shap_values, list):
        return np.stack(
            [np.asarray(values) for values in shap_values],
            axis=-1,
        )

    values = np.asarray(shap_values)

    # Some SHAP versions return (classes, samples, features).
    if (
        values.ndim == 3
        and values.shape[0] == len(CLASS_NAMES)
        and values.shape[-1] != len(CLASS_NAMES)
    ):
        values = np.transpose(values, (1, 2, 0))

    return values


def evaluate(
    y_true,
    y_pred,
    season_names,
) -> dict:
    """Calculate accuracy, Extreme El Niño recall, and precision."""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)

    if len(y_true) != len(y_pred):
        raise ValueError(
            "y_true and y_pred must have the same length."
        )

    if len(season_names) != len(y_true):
        raise ValueError(
            "season_names must match the number of predictions."
        )

    is_true = y_true == EXTREME
    is_pred = y_pred == EXTREME

    tp = int((is_true & is_pred).sum())
    fp = int((~is_true & is_pred).sum())
    fn = int((is_true & ~is_pred).sum())

    return {
        "accuracy": float(
            accuracy_score(y_true, y_pred)
        ),
        "recall": (
            tp / (tp + fn)
            if (tp + fn)
            else 0.0
        ),
        "precision": (
            tp / (tp + fp)
            if (tp + fp)
            else 0.0
        ),
        "extreme_detected": [
            season_names[index]
            for index in np.where(is_true & is_pred)[0]
        ],
    }
