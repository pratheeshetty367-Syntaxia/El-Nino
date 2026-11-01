# Extreme El Niño Explainable ML Platform
 
Full-stack research application for the paper **"Lead-Time Oceanic Predictor Importance Analysis for Extreme El Niño Using XGBoost and SHAP"**.
 
- **Frontend:** React 18 + Vite, React Router, Recharts
- **Backend:** Python, FastAPI, SQLAlchemy, JWT authentication (PyJWT + bcrypt)
- **ML:** XGBoost, scikit-learn, SHAP, pandas, NumPy (+ LightGBM and CatBoost for the baseline comparison)
- **Database:** PostgreSQL
 
## What the app contains
 
| Area | Description |
|------|-------------|
| Login / registration | JWT bearer-token authentication, bcrypt password hashing |
| Dashboard | Key figures from the study, dominant predictor per lead time, recent predictions |
| Overview | Presentation-ready summary: research question, dominant-predictor timeline, importance heatmap, accuracy chart and event pathways |
| Prediction | Choose 3/6/9/12-month lead time, enter the five predictors, see class probabilities and SHAP contributions |
| Predictor importance | Heatmap, line chart and table of mean absolute SHAP per predictor and lead time (Table II) - published and recomputed |
| Historical events | Event-level dominant predictor for 1982/83, 1997/98 and 2015/16 (Table III) |
| Model comparison | XGBoost vs Random Forest, Logistic Regression, SVM, LightGBM, CatBoost (Tables I, IV, V) |
| Dataset explorer | Summary statistics, 45 labelled DJF seasons, paginated monthly records |
| History | Saved predictions with details and delete |
| Methodology | The paper's methodology, unchanged |
| Admin / researcher | Statistics, user roles, background training of models and baselines |
 
**Published vs recomputed.** The numbers typed from the paper (Tables I-V) live in
`backend/app/data/research_results.json` and are shown as "Published (paper)".
Nothing else is invented: the models, SHAP values, LOOCV metrics and event-level
shares shown as "Recomputed here" are produced by running the methodology on **your**
`master_dataset` file.
 
## Folder structure
 
```
elnino-xai/
├── README.md
├── docker-compose.yml
├── .gitignore
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py  config.py  database.py  models.py  schemas.py  security.py  deps.py
│   │   ├── routers/   auth.py predict.py history.py research.py dataset.py admin.py
│   │   ├── services/  ml_service.py dataset_service.py
│   │   └── data/research_results.json
│   ├── ml/            pipeline.py train.py baselines.py
│   ├── database/schema.sql
│   ├── data/          <- put master_dataset.csv here
│   └── artifacts/     <- trained models and computed results are written here
└── frontend/
    ├── package.json  vite.config.js  index.html  .env.example
    └── src/  main.jsx App.jsx api.js styles.css
              components/ context/ hooks/ lib/ pages/
```
 
## Prerequisites
 
- Python 3.10+ (the paper used 3.12)
- Node.js 18+
- PostgreSQL 14+ (or Docker)
 
## Setup
 
### 1. Database
 
Option A - Docker (from the project root):
 
```
docker compose up -d
```
 
Option B - existing PostgreSQL:
 
```
createdb elnino
```
 
The tables are created automatically when the backend starts
(`backend/database/schema.sql` is provided for reference).
 
### 2. Backend
 
```
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate        macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env        # macOS/Linux: cp .env.example .env
```
 
Edit `.env`: set `DATABASE_URL`, a long random `SECRET_KEY`, and `ADMIN_EMAIL`
(the account that registers with this address becomes an admin).
 
> SHAP needs a C++ build toolchain on some Windows setups. If `pip install shap`
> fails, install the Microsoft C++ Build Tools, or run the training step
> (`python -m ml.train`) in Google Colab as in the paper and copy the resulting
> `artifacts/` folder back into `backend/`.
 
### 3. Add your dataset
 
Copy `master_dataset.csv` from your `elnino_project` folder into `backend/data/`.
Required columns (case-insensitive): `Year, Month, sst_anom, ohc_anom, iod_dmi, wind_anom, atl_sst_anom, nino34_anom`
(a `Target` column may also be present). The other files in your project folder are not needed;
the lead-time datasets are regenerated from the master dataset.
 
### 4. Train the models
 
```
cd backend
python -m ml.train        # LOOCV + final models + SHAP + event-level shares
python -m ml.baselines    # optional: recompute the five baseline classifiers
```
 
Check that the console reports 45 seasons with class counts 30 / 12 / 3. Training can also be
started later from the Admin page.
 
### 5. Run the backend
 
```
cd backend
uvicorn app.main:app --reload --port 8000
```
 
API documentation: http://localhost:8000/docs
 
### 6. Run the frontend
 
```
cd frontend
npm install
copy .env.example .env     # macOS/Linux: cp .env.example .env
npm run dev
```
 
Open http://localhost:5173, register an account (use `ADMIN_EMAIL` for the admin account) and sign in.
 
## Methodology implemented (unchanged from the paper)
 
1. Five NOAA predictors, monthly, January 1980 - April 2025 (544 rows); anomalies against the 1991-2020 climatology.
2. Target: 3-month DJF mean of the Niño3.4 anomaly, assigned to the January row. Extreme >= 2.0 C, Normal >= 0.5 C and < 2.0 C, Non-Niño < 0.5 C. Result: 45 seasons (30 / 12 / 3).
3. Lead-time datasets (3, 6, 9, 12 months): predictors from L months before each January.
4. XGBoost: 100 trees, max depth 3, learning rate 0.1, `multi:softprob`.
5. Class weights w_i = N / (K N_k), recomputed on each training fold.
6. Leave-One-Out CV: train on 44 seasons, test on 1, repeated 45 times.
7. Final model per lead time on all 45 seasons; SHAP TreeExplainer; importance = mean |SHAP| over seasons and classes.
 
## Notes and limitations
 
- The paper gives no hyper-parameters for the baseline classifiers; defaults are set in `backend/ml/baselines.py` (`MODEL_FACTORIES`). Recomputed baseline numbers can therefore differ slightly from Tables IV and V.
- Exact recomputed values may differ slightly from the paper with different library versions or random seeds (the paper used XGBoost 3.3.0, scikit-learn 1.9.0, SHAP 0.52.0).
- The paper's event-level percentages are interpreted as each predictor's share of the mean absolute SHAP output for that event's season.
- Only three Extreme El Niño events exist in the record, so all results are descriptive, not an operational forecast. The 12-month model detected no extreme events.
- JWT tokens are stored in `localStorage` for simplicity; for a public deployment move them to HTTP-only cookies and serve over HTTPS.
 
## Troubleshooting
 
| Problem | Fix |
|---------|-----|
| "Cannot reach the server" | Start the backend; check `VITE_API_URL` and `CORS_ORIGINS` |
| 503 "model has not been trained" | Run `python -m ml.train` or start training from the Admin page |
| Dataset page says "Dataset not found" | Put `master_dataset.csv` in `backend/data/` |
| `ValueError: master dataset is missing columns` | Rename columns to match the list above |
| `psycopg2` connection errors | Check `DATABASE_URL` and that PostgreSQL is running |
