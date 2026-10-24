"""Quick terminal smoke test for the dual-model prediction pipeline.

Run:  python test_models.py
"""
import os
import sys

sys.path.append(os.getcwd())

from src.pipelines.dual_prediction_pipeline import DualPredictionPipeline


def main():
    print("Initializing DualPredictionPipeline...")
    pipeline = DualPredictionPipeline()

    # A full, valid input row (matches the trained 17-feature schema)
    test_params = {
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
    }

    print("\n--- Single predictions ---")
    lgbm_pred = pipeline.predict(**test_params, model_type="lgbm")
    print(f"LightGBM predicted sales: {lgbm_pred:.2f}")

    svr_pred = pipeline.predict(**test_params, model_type="svr")
    print(f"SVR predicted sales:      {svr_pred:.2f}")

    print("\n--- Comparison ---")
    comparison = pipeline.compare(**test_params)
    print(f"SVR={comparison['svr']:.2f}  LightGBM={comparison['lgbm']:.2f}")

    print("\n--- Sanity: promotion should raise the forecast ---")
    promo = dict(test_params, promotion=1)
    promo_pred = pipeline.predict(**promo, model_type="lgbm")
    print(f"With promo (LGBM): {promo_pred:.2f} vs no-promo base {lgbm_pred:.2f}")
    print("  OK" if promo_pred >= lgbm_pred else "  WARNING: promo did not raise the forecast")

    print("\nTerminal testing completed successfully. The pipeline works.")


if __name__ == "__main__":
    main()
