"""
Nexus Sales Forecasting API - production entrypoint.

Serves dual-model (SVR + LightGBM) newspaper/magazine sales forecasts.

Production features wired in here:
* Models/artifacts loaded ONCE at startup via lifespan (not per request).
* Strict input validation (numeric bounds + categorical allow-lists from the encoders).
* Liveness (/health) and readiness (/ready) probes for orchestrators.
* Optional API-key auth: set the API_KEY env var to require an `x-api-key` header.
  If API_KEY is unset the API is OPEN - fine for local/dev, NOT for public deploys.
* Structured logging and a global exception handler (no stack traces leak to clients).
"""
import logging
import os
from contextlib import asynccontextmanager
from datetime import date

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional

from src.components.config import settings
from src.pipelines.dual_prediction_pipeline import DualPredictionPipeline
from src.pipelines.dual_train_pipeline import run as retrain_models

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("nexus.api")

static_dir = os.path.join(os.path.dirname(__file__), "static")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.pipeline = DualPredictionPipeline()
        logger.info("Startup complete: prediction pipeline loaded.")
    except Exception as exc:  # keep serving /health even if artifacts are missing
        app.state.pipeline = None
        logger.error("Startup failed to load pipeline: %s", exc)
    yield
    app.state.pipeline = None


app = FastAPI(
    title="Nexus Sales Forecasting API",
    description="Dual-model (SVR & LightGBM) newspaper/magazine sales forecasting.",
    version="3.0.0",
    lifespan=lifespan,
)

if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


# --- Schemas ---------------------------------------------------------------
class PredictionInput(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    publication_name: str = "Mythological Tales"
    publication_category: str = "Religious & Spiritual"
    price: float = Field(5.0, gt=0, le=1000)
    customer_age: int = Field(35, ge=1, le=120)
    income_level: str = "Medium"
    educational_background: str = "Bachelor"
    occupation: str = "Professional"
    region: str = "North"
    promo_discount: int = Field(0, ge=0, le=100)
    special_events: str = "None"
    festival_name: str = "None"
    previous_day_sales: int = Field(650, ge=0, le=100_000)
    previous_week_sales: int = Field(700, ge=0, le=100_000)
    model_type: Literal["svr", "lgbm"] = "lgbm"


class CompareInput(BaseModel):
    publication_name: str = "Mythological Tales"
    publication_category: str = "Religious & Spiritual"
    price: float = Field(5.0, gt=0, le=1000)
    customer_age: int = Field(35, ge=1, le=120)
    income_level: str = "Medium"
    educational_background: str = "Bachelor"
    occupation: str = "Professional"
    region: str = "North"
    promo_discount: int = Field(0, ge=0, le=100)
    special_events: str = "None"
    festival_name: str = "None"
    previous_day_sales: int = Field(650, ge=0, le=100_000)
    previous_week_sales: int = Field(700, ge=0, le=100_000)


class ForecastInput(BaseModel):
    """Seller-facing input: pick a day + local knowledge. History/lags are auto-filled."""
    model_config = ConfigDict(protected_namespaces=())
    publication_name: str = "Mythological Tales"
    publication_category: str = "Religious & Spiritual"
    price: float = Field(5.0, gt=0, le=1000)
    customer_age: int = Field(35, ge=1, le=120)
    income_level: str = "Medium"
    educational_background: str = "Bachelor"
    occupation: str = "Professional"
    region: str = "North"
    promo_discount: int = Field(0, ge=0, le=100)
    special_events: str = "None"
    festival_name: str = "None"
    target_date: date = Field(default_factory=date.today)
    model_type: Literal["svr", "lgbm"] = "lgbm"


class RecordSaleInput(BaseModel):
    """Log a real day's sales so both models retrain on genuine data."""
    publication_name: str = "Mythological Tales"
    publication_category: str = "Religious & Spiritual"
    price: float = Field(5.0, gt=0, le=1000)
    customer_age: int = Field(35, ge=1, le=120)
    income_level: str = "Medium"
    educational_background: str = "Bachelor"
    occupation: str = "Professional"
    region: str = "North"
    promo_discount: int = Field(0, ge=0, le=100)
    special_events: str = "None"
    festival_name: str = "None"
    target_date: date = Field(default_factory=date.today)
    actual_sales_quantity: int = Field(..., ge=0, le=100_000)


# --- Dependencies / helpers ------------------------------------------------
def require_api_key(x_api_key: Optional[str] = Header(default=None)):
    expected = os.getenv("API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


def get_pipeline(request: Request) -> DualPredictionPipeline:
    pipeline = getattr(request.app.state, "pipeline", None)
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model artifacts not loaded. Train the models and restart.")
    return pipeline


def validate_categoricals(pipeline: DualPredictionPipeline, payload: dict):
    """Reject unknown categorical values with a helpful 422 listing the allowed set."""
    options = pipeline.valid_options()
    field_to_col = {
        "publication_category": "Publication_Category",
        "income_level": "Income_Level",
        "educational_background": "Educational_Background",
        "occupation": "Occupation",
        "region": "Region",
        "special_events": "Special_Events",
        "festival_name": "Festival_Name",
    }
    for field, col in field_to_col.items():
        allowed = options.get(col)
        if allowed and str(payload[field]) not in allowed:
            raise HTTPException(
                status_code=422,
                detail={"field": field, "value": payload[field], "allowed": allowed},
            )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


# --- Endpoints -------------------------------------------------------------
@app.get("/")
async def root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Nexus Sales Forecasting API is running."}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready(request: Request):
    if getattr(request.app.state, "pipeline", None) is None:
        return JSONResponse(status_code=503, content={"status": "not_ready"})
    return {"status": "ready"}


@app.get("/options")
async def options(pipeline: DualPredictionPipeline = Depends(get_pipeline)):
    return pipeline.valid_options()


@app.get("/metadata")
async def metadata():
    import json
    if os.path.exists(settings.metadata_path):
        with open(settings.metadata_path) as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Model metadata not found. Train the models first.")


@app.get("/dataset-info")
async def dataset_info():
    if not os.path.exists(settings.dataset_path):
        return {"row_count": 0}
    with open(settings.dataset_path, "r") as f:
        return {"row_count": sum(1 for _ in f) - 1}


@app.get("/historical-items")
async def historical_items():
    if not os.path.exists(settings.dataset_path):
        return {"items": []}
    import pandas as pd
    df = pd.read_csv(settings.dataset_path)
    if "Publication_Name" not in df.columns:
        return {"items": []}
        
    grouped = df.groupby("Publication_Name").agg({
        "Publication_Category": "first",
        "Price": "mean"
    }).reset_index()
    
    items = []
    for _, row in grouped.iterrows():
        items.append({
            "name": row["Publication_Name"],
            "category": row["Publication_Category"],
            "avg_price": round(row["Price"], 2)
        })
    return {"items": sorted(items, key=lambda x: x["name"])}


@app.post("/predict", dependencies=[Depends(require_api_key)])
async def predict(params: PredictionInput, pipeline: DualPredictionPipeline = Depends(get_pipeline)):
    payload = params.model_dump()
    validate_categoricals(pipeline, payload)
    prediction = pipeline.predict(**payload)
    return {
        "model_used": params.model_type,
        "predicted_sales_quantity": round(prediction),
        "input": payload,
    }


@app.post("/compare", dependencies=[Depends(require_api_key)])
async def compare(params: CompareInput, pipeline: DualPredictionPipeline = Depends(get_pipeline)):
    payload = params.model_dump()
    validate_categoricals(pipeline, payload)
    results = pipeline.compare(**payload)
    return {
        "svr_prediction": round(results["svr"]),
        "lgbm_prediction": round(results["lgbm"]),
        "difference": round(abs(results["svr"] - results["lgbm"])),
        "input": payload,
    }


# --- Seller-facing endpoints -----------------------------------------------
@app.post("/forecast", dependencies=[Depends(require_api_key)])
async def forecast(params: ForecastInput, pipeline: DualPredictionPipeline = Depends(get_pipeline)):
    """One number for one day: auto-detect festival/holiday/weekend + auto-fill history, then predict."""
    payload = params.model_dump()
    validate_categoricals(pipeline, payload)
    if pipeline.history is None:
        raise HTTPException(status_code=503, detail="Sales history not loaded; forecasting is unavailable. Generate the dataset and restart.")
    return pipeline.forecast(**payload)


@app.post("/record-sale", dependencies=[Depends(require_api_key)])
async def record_sale(params: RecordSaleInput, pipeline: DualPredictionPipeline = Depends(get_pipeline)):
    """Append a real day's sales to history. Models must be retrained manually via /retrain."""
    payload = params.model_dump()
    validate_categoricals(pipeline, payload)
    if pipeline.history is None:
        raise HTTPException(status_code=503, detail="Sales history not loaded; cannot record sales.")

    row = pipeline.build_record_row(**payload)
    total_rows = pipeline.history.append_actual(row)
    logger.info("Recorded a sale; history now %d rows.", total_rows)

    return {
        "recorded": True,
        "total_rows": total_rows,
        "retrained": False,
        "message": "Sale recorded. Call /retrain to update the models with new data."
    }

from fastapi import BackgroundTasks

def background_retrain_task(app_state):
    try:
        import asyncio
        retrain_models()
        app_state.pipeline = DualPredictionPipeline()
        logger.info("Models retrained and pipeline reloaded successfully.")
    except Exception as e:
        logger.error(f"Background retrain failed: {e}")

@app.post("/retrain", dependencies=[Depends(require_api_key)])
async def retrain(request: Request, background_tasks: BackgroundTasks):
    """Trigger a manual retrain of both models in the background."""
    background_tasks.add_task(background_retrain_task, request.app.state)
    logger.info("Background retrain task initiated.")

    return {
        "retrained": "pending",
        "message": "Model retraining started in the background. It may take 1-2 minutes.",
    }

@app.get("/genres")
async def get_genres(pipeline: DualPredictionPipeline = Depends(get_pipeline)):
    """Return the list of valid book/magazine genres based on the loaded model encoders."""
    options = pipeline.valid_options()
    return {"genres": options.get("Publication_Category", [])}
