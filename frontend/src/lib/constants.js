export const LEADS = [3, 6, 9, 12];
 
export const PREDICTORS = [
  { key: "sst_anom", name: "SST", full: "Sea Surface Temperature", color: "#0072B2" },
  { key: "ohc_anom", name: "OHC", full: "Ocean Heat Content", color: "#D55E00" },
  { key: "iod_dmi", name: "IOD", full: "Indian Ocean Dipole (DMI)", color: "#009E73" },
  { key: "wind_anom", name: "Wind", full: "Equatorial wind anomaly", color: "#CC79A7" },
  { key: "atl_sst_anom", name: "Atl. SST", full: "Tropical Atlantic SST", color: "#E69F00" },
];
 
export const predictorName = (key) => PREDICTORS.find((p) => p.key === key)?.name ?? key;
 
export const CLASS_COLORS = {
  "Non-Niño": "#56B4E9",
  "Normal El Niño": "#E69F00",
  "Extreme El Niño": "#D55E00",
};
 
export const MODEL_COLORS = {
  XGBoost: "#0072B2",
  "Random Forest": "#009E73",
  "Logistic Regression": "#E69F00",
  SVM: "#CC79A7",
  LightGBM: "#56B4E9",
  CatBoost: "#D55E00",
};
 
export const fmt = (value, digits = 4) =>
  value === null || value === undefined || Number.isNaN(value) ? "—" : Number(value).toFixed(digits);
 
export const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

