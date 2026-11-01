Place your dataset files in this folder.
 
Required:
  master_dataset.csv   (or master_dataset.xlsx)
 
Required columns (case-insensitive):
  Year, Month, sst_anom, ohc_anom, iod_dmi, wind_anom, atl_sst_anom, nino34_anom
  (a Target column may be present; labels are regenerated from nino34_anom
   using the DJF thresholds described in the paper)
 
The file must contain one row per month, January 1980 - April 2025 (544 rows).
 
The other files from your project folder (leadtime_3m/6m/9m/12m,
model_comparison_results, shap_importance_results) are NOT required: the app
regenerates the lead-time datasets, LOOCV metrics and SHAP values from
master_dataset by running `python -m ml.train`.

