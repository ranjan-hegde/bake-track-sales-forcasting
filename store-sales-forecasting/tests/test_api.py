"""API tests using FastAPI's TestClient.

Run:  pip install -r requirements-dev.txt && pytest
Requires trained artifacts (run `python -m src.pipelines.dual_train_pipeline` first).
"""
import os

import pytest
from fastapi.testclient import TestClient

import dual_app

ARTIFACTS_READY = os.path.exists(os.path.join("artifacts", "lgbm_model.joblib"))
pytestmark = pytest.mark.skipif(not ARTIFACTS_READY, reason="Trained artifacts not present")

VALID_BODY = {
    "publication_name": "The Daily News",
    "publication_category": "News",
    "price": 5.0,
    "customer_age": 35,
    "income_level": "Medium",
    "educational_background": "Bachelor",
    "occupation": "Professional",
    "region": "North",
    "promotion": 0,
    "special_events": "None",
    "previous_day_sales": 650,
    "previous_week_sales": 700,
    "model_type": "lgbm",
}


@pytest.fixture(scope="module")
def client():
    with TestClient(dual_app.app) as c:  # triggers lifespan (loads models)
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_ready(client):
    r = client.get("/ready")
    assert r.status_code == 200 and r.json()["status"] == "ready"


def test_predict_ok(client):
    r = client.post("/predict", json=VALID_BODY)
    assert r.status_code == 200
    body = r.json()
    assert body["model_used"] == "lgbm"
    assert body["predicted_sales_quantity"] >= 0


def test_predict_rejects_unknown_region(client):
    r = client.post("/predict", json=dict(VALID_BODY, region="Atlantis"))
    assert r.status_code == 422


def test_predict_rejects_bad_model_type(client):
    r = client.post("/predict", json=dict(VALID_BODY, model_type="mystery"))
    assert r.status_code == 422


def test_predict_rejects_out_of_range_age(client):
    r = client.post("/predict", json=dict(VALID_BODY, customer_age=999))
    assert r.status_code == 422


def test_compare_ok(client):
    body = {k: v for k, v in VALID_BODY.items() if k != "model_type"}
    r = client.post("/compare", json=body)
    assert r.status_code == 200
    assert {"svr_prediction", "lgbm_prediction", "difference"} <= set(r.json())


def test_options_lists_categories(client):
    r = client.get("/options")
    assert r.status_code == 200 and "Region" in r.json()


# --- Seller-facing /forecast --------------------------------------------------
FORECAST_BODY = {
    "publication_name": "The Daily News",
    "publication_category": "News",
    "price": 5.0,
    "customer_age": 35,
    "income_level": "Medium",
    "educational_background": "Bachelor",
    "occupation": "Professional",
    "region": "North",
    "promotion": 0,
    "special_events": "None",
    "target_date": "2025-07-15",
    "model_type": "lgbm",
}


def test_forecast_ok(client):
    r = client.post("/forecast", json=FORECAST_BODY)
    assert r.status_code == 200
    body = r.json()
    assert body["model_used"] == "lgbm"
    assert body["predicted_sales_quantity"] >= 0
    assert {"date", "season", "is_festival", "is_weekend"} <= set(body["detected"])
    assert "source" in body["sales_context"]


def test_forecast_defaults_target_date_to_today(client):
    body = {k: v for k, v in FORECAST_BODY.items() if k != "target_date"}
    r = client.post("/forecast", json=body)
    assert r.status_code == 200            # target_date is optional (defaults to today)


def test_forecast_rejects_unknown_region(client):
    r = client.post("/forecast", json=dict(FORECAST_BODY, region="Atlantis"))
    assert r.status_code == 422


def test_forecast_rejects_bad_model_type(client):
    r = client.post("/forecast", json=dict(FORECAST_BODY, model_type="mystery"))
    assert r.status_code == 422


def test_record_sale_schema_rejects_unknown_region(client):
    # We don't trigger a real retrain in the suite (slow + mutates artifacts);
    # validation happens before any write, so a bad region is still a clean 422.
    body = {k: v for k, v in FORECAST_BODY.items() if k != "model_type"}
    body["actual_sales_quantity"] = 700
    r = client.post("/record-sale", json=dict(body, region="Atlantis"))
    assert r.status_code == 422
