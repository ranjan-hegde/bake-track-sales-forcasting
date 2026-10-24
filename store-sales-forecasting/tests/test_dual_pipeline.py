"""Unit tests for the dual-model prediction pipeline.

Run:  pip install -r requirements-dev.txt && pytest
Requires trained artifacts (run `python -m src.pipelines.dual_train_pipeline` first).
"""
import os
from datetime import date

import holidays
import pytest

from src.pipelines.dual_prediction_pipeline import DualPredictionPipeline

ARTIFACTS_READY = os.path.exists(os.path.join("artifacts", "lgbm_model.joblib"))
pytestmark = pytest.mark.skipif(not ARTIFACTS_READY, reason="Trained artifacts not present")

BASE_INPUT = dict(
    publication_name="The Daily News",
    publication_category="News",
    price=5.0,
    customer_age=35,
    income_level="Medium",
    educational_background="Bachelor",
    occupation="Professional",
    region="North",
    promotion=0,
    special_events="None",
    previous_day_sales=650,
    previous_week_sales=700,
)


@pytest.fixture(scope="module")
def pipeline():
    return DualPredictionPipeline()


@pytest.mark.parametrize("model_type", ["svr", "lgbm"])
def test_predict_returns_plausible_value(pipeline, model_type):
    pred = pipeline.predict(**BASE_INPUT, model_type=model_type)
    assert isinstance(pred, float)
    assert 0 <= pred <= 5000


def test_compare_returns_both_models(pipeline):
    result = pipeline.compare(**BASE_INPUT)
    assert set(result) == {"svr", "lgbm"}
    assert all(v >= 0 for v in result.values())


def test_unknown_category_falls_back_gracefully(pipeline):
    # An unseen special event must not raise; it falls back to a neutral class.
    weird = dict(BASE_INPUT, special_events="Alien Invasion")
    pred = pipeline.predict(**weird, model_type="lgbm")
    assert pred >= 0


def test_invalid_model_type_raises(pipeline):
    with pytest.raises(Exception):
        pipeline.predict(**BASE_INPUT, model_type="does_not_exist")


def test_promotion_increases_forecast(pipeline):
    base = pipeline.predict(**BASE_INPUT, model_type="lgbm")
    promo = pipeline.predict(**dict(BASE_INPUT, promotion=1), model_type="lgbm")
    assert promo >= base


def test_valid_options_exposes_categories(pipeline):
    opts = pipeline.valid_options()
    assert "Region" in opts and "North" in opts["Region"]
    assert "None" in opts["Special_Events"]


# --- Seller-facing forecast() -------------------------------------------------
FORECAST_INPUT = dict(
    publication_name="The Daily News",
    publication_category="News",
    price=5.0,
    customer_age=35,
    income_level="Medium",
    educational_background="Bachelor",
    occupation="Professional",
    region="North",
    promotion=0,
    special_events="None",
)


def test_forecast_surfaces_detected_flags_on_plain_weekday(pipeline):
    result = pipeline.forecast(**FORECAST_INPUT, target_date=date(2025, 7, 15), model_type="lgbm")
    assert result["model_used"] == "lgbm"
    assert isinstance(result["predicted_sales_quantity"], int)
    assert result["predicted_sales_quantity"] >= 0

    detected = result["detected"]
    assert set(detected) == {"date", "season", "day_name", "is_weekend",
                             "is_holiday", "is_festival", "holiday_name"}
    assert detected["is_festival"] is False          # a plain mid-week day
    assert detected["day_name"] == "Tuesday"
    # Lags were auto-filled (seller never typed them) and a basis is surfaced.
    assert "source" in result["sales_context"]
    assert result["sales_context"]["previous_day_sales"] >= 0


def test_forecast_detects_weekend(pipeline):
    result = pipeline.forecast(**FORECAST_INPUT, target_date=date(2025, 7, 13), model_type="svr")
    assert result["detected"]["is_weekend"] is True   # 2025-07-13 is a Sunday


def test_forecast_detects_festival(pipeline):
    # Find a real Indian festival date inside the dataset's 2-year window.
    fests = ["Diwali", "Holi", "Dussehra", "Christmas", "Navratri",
             "Ganesh Chaturthi", "Maha Shivaratri"]
    fest_date = next(d for d, name in sorted(holidays.IN(years=[2025]).items())
                     if any(f in name for f in fests))
    result = pipeline.forecast(**FORECAST_INPUT, target_date=fest_date, model_type="lgbm")
    assert result["detected"]["is_festival"] is True
    assert result["detected"]["holiday_name"] is not None


def test_forecast_rejects_bad_model_type(pipeline):
    with pytest.raises(Exception):
        pipeline.forecast(**FORECAST_INPUT, target_date=date(2025, 7, 15), model_type="nope")
