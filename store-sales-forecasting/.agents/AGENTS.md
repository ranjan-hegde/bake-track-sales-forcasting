# Store Sales Forecasting Project

## Project Overview
A machine learning-based sales forecasting system for newspaper and book sales using demographic data. The project implements **dual models** (Support Vector Regression + LightGBM) with a FastAPI backend and a web UI.

The web UI is a **seller's day-to-day tool**, not a model-comparison demo: the seller picks a calendar date and one model, the app auto-detects that day's festival/holiday/weekend/season and auto-fills the sales-history lag features, and returns a single forecast. Recording the day's real sales appends to the CSV and **retrains both models immediately** (`/record-sale`). `/predict` and `/compare` remain for programmatic/side-by-side use.

## Directory Structure
```
store-sales-forecasting/
├── app.py                          # Original FastAPI app (LightGBM + Darts, DO NOT MODIFY)
├── dual_app.py                     # NEW FastAPI app: seller /forecast + /record-sale, plus /predict & /compare
├── test_models.py                  # Terminal testing script for both models
├── interactive_cli.py              # NEW: interactive terminal prediction tool
├── generate_dataset.py             # Script to generate the synthetic dataset (~14.6k rows)
├── generate_pdf.py                 # Script to generate project report PDF
├── Dockerfile                      # Docker containerization config (runs dual_app:app)
├── requirements.txt                # Original project dependencies
├── requirements-dual.txt           # NEW: pinned deps for the dual-model app
├── requirements-dev.txt            # NEW: test deps (pytest, httpx)
├── .env.example                    # NEW: documents runtime env vars
├── setup.py                        # Package setup
│
├── artifacts/                      # All saved models, datasets, scalers
│   ├── synthetic_sales_data.csv    # ~14.6k-row demographic sales dataset
│   ├── svr_model.joblib            # Trained SVR model
│   ├── lgbm_model.joblib           # Trained LightGBM model
│   ├── scaler.joblib               # StandardScaler for feature scaling
│   ├── encoders.joblib             # Label encoders for categorical columns
│   ├── feature_names.joblib        # Exact trained feature order
│   ├── model_metadata.json         # NEW: version, metrics, lib versions, timestamp
│   └── dual_model_results.json     # Evaluation metrics for both models
│
├── src/
│   ├── components/
│   │   ├── config.py               # NEW: env-driven Settings + artifact/dataset paths
│   │   ├── data_preprocessor.py    # NEW: Cleans, encodes, scales synthetic dataset
│   │   ├── dual_model_trainer.py   # NEW: Trains both SVR and LightGBM + writes metadata
│   │   ├── history_lookup.py       # NEW: auto-fills lag features from history + appends recorded sales
│   │   ├── dual_utils.py           # NEW: CustomException + logging for the dual app
│   │   ├── data_ingestion.py       # Original (MongoDB ingestion, DO NOT MODIFY)
│   │   ├── data_transformation.py  # Original (Darts TimeSeries, DO NOT MODIFY)
│   │   ├── model_trainer.py        # Original (Darts LightGBM, DO NOT MODIFY)
│   │   └── model_evaluation.py     # Original (Darts evaluation, DO NOT MODIFY)
│   │
│   ├── pipelines/
│   │   ├── dual_prediction_pipeline.py  # NEW: predict/compare + seller forecast() & record-row builder
│   │   ├── dual_train_pipeline.py       # NEW: preprocess + train entrypoint (also the retrain hook)
│   │   ├── train_pipeline.py            # Original (DO NOT MODIFY)
│   │   └── prediction_pipeline.py       # Original (DO NOT MODIFY)
│   │
│   └── utils/
│       ├── __init__.py             # Original covariate generator (DO NOT MODIFY)
│       ├── exception.py            # Custom exception handler
│       └── logger.py               # Logging config
│
├── tests/                          # NEW: pytest suites (skip when artifacts absent)
│   ├── conftest.py
│   ├── test_dual_pipeline.py       # Pipeline unit tests (predict/compare/forecast)
│   ├── test_history_lookup.py      # HistoryLookup tests (temp CSVs, no artifacts needed)
│   └── test_api.py                 # API tests via FastAPI TestClient
│
├── static/                         # Web UI files
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── research/                       # Jupyter notebooks & drift reports
```

## Tech Stack
- **ML Models:** SVR (scikit-learn, RBF kernel), LightGBM
- **Data Processing:** Pandas, NumPy, Scikit-learn (StandardScaler, LabelEncoder)
- **API:** FastAPI + Uvicorn, Pydantic v2 validation
- **Config:** env-driven `Settings` (`src/components/config.py`), optional `.env`
- **Testing:** pytest + FastAPI TestClient
- **Deployment:** Docker (non-root, HEALTHCHECK)
- **MLOps:** Joblib artifacts, `model_metadata.json` versioning, Git

## Key Rules
- **NEVER modify** files marked "DO NOT MODIFY" — they belong to the original pipeline
- All new code goes in NEW files only
- The synthetic dataset lives at `artifacts/synthetic_sales_data.csv` (~14,620 rows: Publication × Region × 731 days)
- Both SVR and LightGBM train on the full 80% training split (~11,696 rows) and are evaluated on the same 20% test set (~2,924 rows)
- Regenerate data with `python generate_dataset.py`; retrain end-to-end with `python -m src.pipelines.dual_train_pipeline`
- The 17-feature demographic schema is canonical; column order in `generate_dataset.py` defines the trained feature order (persisted to `feature_names.joblib`)
- `Special_Events` uses the literal string `"None"` as a real category — the preprocessor restores it after `read_csv` (pandas parses bare `None` as NaN)
- **Seller endpoints:** `/forecast` auto-fills the two lag features from `history_lookup.py` (never user-typed); `/record-sale` appends one canonical 19-column row via `HistoryLookup.append_actual`, retrains both models with `dual_train_pipeline.run()` in a threadpool, then hot-reloads `app.state.pipeline`. Gate `/record-sale` in production with `API_KEY` (it writes to disk + trains).
- **Festival lag nuance:** on a festival day, do NOT feed the festival average back as `Previous_Day_Sales` — the `Is_Festival` flag already captures the lift, so the lag stays a realistic baseline and the festival average is returned as a display-only `festival_reference` insight.
- The append order in `history_lookup.CANONICAL_COLUMNS` (19 cols = 17 features + `Date` + `Sales_Quantity`) must match what `generate_dataset.py` writes and what the preprocessor reads.
