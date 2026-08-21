"""
data_processor.py

Implements the Data Ingestion/Preprocessing and Lead-Time Dataset Generation
modules claimed in the patent (Q6, Q8), replicating the paper's Section III-D
methodology in code — rather than relying on pre-built CSV files.

Given the master dataset (monthly oceanic anomalies with DJF-season labels),
this module reconstructs each lead-time dataset (3/6/9/12-month) by looking
back the appropriate number of months from each labelled January and pairing
those predictor values with that season's Target label.
"""

import pandas as pd

FEATURE_COLUMNS = ["sst_anom", "ohc_anom", "iod_dmi", "wind_anom", "atl_sst_anom"]


def generate_lead_time_dataset(master_df: pd.DataFrame, lead_months: int) -> pd.DataFrame:
    """
    Construct the lead-time dataset for a given forecast horizon, directly
    from the master dataset — matching the paper's Section III-D method.

    Args:
        master_df: the full monthly master dataset (Year, Month, 5 predictor
                    anomaly columns, nino34_anom, Target — Target/nino34_anom
                    populated only on January/DJF-labelled rows)
        lead_months: one of 3, 6, 9, 12

    Returns:
        A 45-row DataFrame with columns: target_year, lead_months,
        predictor_date, the 5 predictor columns, nino34_anom, Target.
        Matches the shape and values of the original leadtime_Xm.csv files.
    """
    # Only January rows carry a season label (DJF classification)
    labelled = master_df[master_df["Target"].notna()].copy()

    # Drop the earliest labelled season: its 12-month lookback would need
    # data from before the master dataset begins, so it's excluded from
    # every lead time uniformly, keeping all four datasets directly comparable
    # (the paper reports exactly 45 samples per lead time, not 46).
    earliest_year = labelled["Year"].min()
    labelled = labelled[labelled["Year"] != earliest_year]

    # Fast (Year, Month) -> row lookup for finding the lookback month
    lookup = master_df.set_index(["Year", "Month"])

    rows = []
    for _, jan_row in labelled.iterrows():
        target_year = int(jan_row["Year"])

        # Step back `lead_months` from January (month 1) of target_year
        total_month_index = target_year * 12 + 1 - lead_months
        pred_year = (total_month_index - 1) // 12
        pred_month = (total_month_index - 1) % 12 + 1

        pred_row = lookup.loc[(pred_year, pred_month)]

        rows.append({
            "target_year": target_year,
            "lead_months": lead_months,
            "predictor_date": f"{pred_year}-{pred_month:02d}",
            **{col: pred_row[col] for col in FEATURE_COLUMNS},
            "nino34_anom": jan_row["nino34_anom"],  # target season's own value (diagnostic, not a predictor)
            "Target": jan_row["Target"],
        })

    return pd.DataFrame(rows)


def generate_all_lead_time_datasets(master_df: pd.DataFrame) -> dict:
    """
    Generate lead-time datasets for all four forecast horizons at once.

    Returns:
        {3: DataFrame, 6: DataFrame, 9: DataFrame, 12: DataFrame}
    """
    return {lead: generate_lead_time_dataset(master_df, lead) for lead in (3, 6, 9, 12)}


# Quick manual test — verifies the generator reproduces the existing CSVs exactly
if __name__ == "__main__":
    from src.data_loader import load_master_dataset, load_leadtime_data

    master = load_master_dataset()

    for lead in (3, 6, 9, 12):
        generated = generate_lead_time_dataset(master, lead)
        existing = load_leadtime_data(lead)

        generated_aligned = generated[existing.columns.tolist()].reset_index(drop=True)
        existing_aligned = existing.reset_index(drop=True)

        numeric_cols = generated_aligned.select_dtypes(include="number").columns
        text_cols = [c for c in generated_aligned.columns if c not in numeric_cols]

        numeric_match = generated_aligned[numeric_cols].round(6).equals(existing_aligned[numeric_cols].round(6))
        text_match = (generated_aligned[text_cols].astype(str) == existing_aligned[text_cols].astype(str)).all().all()

        status = "MATCH" if (numeric_match and text_match) else "MISMATCH"
        print(f"Lead {lead}m: {status} ({len(generated)} rows generated vs {len(existing)} existing)")