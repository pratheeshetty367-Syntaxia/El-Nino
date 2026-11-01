"""Locate and load the master dataset (CSV or Excel) from backend/data."""
from __future__ import annotations
 
import json
from functools import lru_cache
from pathlib import Path
 
import pandas as pd
 
from ..config import settings
from ml.pipeline import FEATURES, FEATURE_LABELS, build_season_table, normalise_columns
 
MASTER_STEM = "master_dataset"
 
 
def find_master_file() -> Path | None:
    for ext in (".csv", ".xlsx", ".xls"):
        candidate = Path(settings.data_dir) / f"{MASTER_STEM}{ext}"
        if candidate.exists():
            return candidate
    return None
 
 
@lru_cache(maxsize=2)
def _read(path: str, mtime: float) -> pd.DataFrame:
    if path.lower().endswith(".csv"):
        raw = pd.read_csv(path)
    else:
        raw = pd.read_excel(path)
    return normalise_columns(raw)
 
 
def get_master() -> pd.DataFrame | None:
    """Return the normalised master dataset, or None if the file is not present."""
    path = find_master_file()
    if path is None:
        return None
    return _read(str(path), path.stat().st_mtime)
 
 
def require_master() -> pd.DataFrame:
    df = get_master()
    if df is None:
        raise FileNotFoundError(
            f"master_dataset.csv/.xlsx not found in {settings.data_dir}. "
            "Copy your dataset files into backend/data/."
        )
    return df
 
 
def records(df: pd.DataFrame) -> list[dict]:
    """DataFrame -> JSON-safe list of dicts (NaN becomes null)."""
    return json.loads(df.to_json(orient="records", date_format="iso"))
 
 
def summary(df: pd.DataFrame) -> dict:
    seasons = build_season_table(df)
    stats = {}
    for feature in [*FEATURES, "nino34_anom"]:
        col = df[feature]
        stats[feature] = {
            "label": FEATURE_LABELS.get(feature, "Niño3.4"),
            "min": float(col.min()),
            "max": float(col.max()),
            "mean": float(col.mean()),
            "std": float(col.std()),
            "missing": int(col.isna().sum()),
        }
    return {
        "rows": int(len(df)),
        "first_month": f"{int(df['year'].iloc[0])}-{int(df['month'].iloc[0]):02d}",
        "last_month": f"{int(df['year'].iloc[-1])}-{int(df['month'].iloc[-1]):02d}",
        "columns": [c for c in df.columns if c != "date"],
        "stats": stats,
        "season_count": int(len(seasons)),
        "season_classes": seasons["label_name"].value_counts().to_dict(),
    }

