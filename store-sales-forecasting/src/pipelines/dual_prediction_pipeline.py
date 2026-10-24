"""
Prediction pipeline for the dual-model (SVR + LightGBM) sales forecaster.

Design notes for production:
* All artifacts (scaler, encoders, feature order, BOTH models) are loaded ONCE when
  the pipeline is constructed, not per request. Construct it once at app startup.
* Unknown categorical values fall back to 'None' when that class exists (a neutral,
  learnable value), otherwise to the first class - and the event is logged.
* Temporal features (day of week, weekend, season, holiday/festival flags) are derived
  from the target date (defaults to today) so callers never supply them by hand.
"""
import os
from datetime import datetime, date

import holidays
import joblib
import pandas as pd

from src.components.config import settings
from src.components.dual_utils import CustomException, logging
from src.components.history_lookup import HistoryLookup

VALID_MODELS = ("svr", "lgbm")


class DualPredictionPipeline:
    def __init__(self, artifacts_dir: str | None = None):
        try:
            self.settings = settings if artifacts_dir is None else settings.__class__(
                artifacts_dir=artifacts_dir,
                default_model=settings.default_model,
                log_level=settings.log_level,
                api_host=settings.api_host,
                api_port=settings.api_port,
            )
            for label, path in {
                "scaler": self.settings.scaler_path,
                "encoders": self.settings.encoders_path,
                "feature_names": self.settings.feature_names_path,
                "svr_model": self.settings.svr_model_path,
                "lgbm_model": self.settings.lgbm_model_path,
            }.items():
                if not os.path.exists(path):
                    raise FileNotFoundError(f"Required artifact '{label}' not found at {path}. Run the training pipeline first.")

            self.scaler = joblib.load(self.settings.scaler_path)
            self.encoders = joblib.load(self.settings.encoders_path)
            self.feature_names = joblib.load(self.settings.feature_names_path)
            # Load both models up front so /predict never pays disk I/O.
            self.models = {
                "svr": joblib.load(self.settings.svr_model_path),
                "lgbm": joblib.load(self.settings.lgbm_model_path),
            }
            self._holiday_cache: dict[int, holidays.HolidayBase] = {}
            # Sales-history lookup (auto-fills lag features & records real sales).
            # Optional: a missing CSV must not break /predict, only /forecast & /record-sale.
            try:
                self.history = HistoryLookup(self.settings.dataset_path)
            except Exception as hist_err:
                logging.warning("Sales history unavailable: %s", hist_err)
                self.history = None
            logging.info("DualPredictionPipeline ready: models=%s, features=%d", list(self.models), len(self.feature_names))
        except Exception as e:
            raise CustomException(e)

    def _holidays_for(self, year: int) -> "holidays.HolidayBase":
        if year not in self._holiday_cache:
            self._holiday_cache[year] = holidays.IN(years=[year])
        return self._holiday_cache[year]

    def get_holiday_context(self, target: date):
        """Return (is_festival, is_holiday, holiday_name) for a date. Name is None if plain day."""
        custom_festivals = {
            date(2024, 1, 13): 'Lohri', date(2024, 1, 15): 'Makar Sankranti/Pongal',
            date(2024, 3, 8): 'Maha Shivaratri', date(2024, 3, 25): 'Holi',
            date(2024, 4, 9): 'Ugadi/Gudi Padwa', date(2024, 4, 17): 'Ram Navami',
            date(2024, 4, 21): 'Mahavir Jayanti', date(2024, 4, 13): 'Baisakhi',
            date(2024, 5, 23): 'Buddha Purnima', date(2024, 8, 19): 'Raksha Bandhan',
            date(2024, 8, 26): 'Janmashtami', date(2024, 9, 7): 'Ganesh Chaturthi',
            date(2024, 9, 15): 'Onam', date(2024, 10, 3): 'Navratri',
            date(2024, 10, 11): 'Maha Navami', date(2024, 10, 12): 'Durga Puja/Dussehra',
            date(2024, 10, 20): 'Karva Chauth', date(2024, 10, 31): 'Diwali',
            date(2024, 11, 3): 'Bhai Dooj', date(2024, 11, 7): 'Chhath',
            date(2024, 11, 15): 'Guru Nanak Jayanti', date(2024, 12, 25): 'Christmas',
            date(2024, 4, 11): 'Eid al-Fitr', date(2024, 6, 17): 'Eid al-Adha',
            date(2025, 3, 14): 'Holi', date(2025, 8, 27): 'Ganesh Chaturthi', date(2025, 10, 2): 'Dussehra', date(2025, 10, 20): 'Diwali', date(2025, 12, 25): 'Christmas',
            date(2026, 3, 4): 'Holi', date(2026, 9, 14): 'Ganesh Chaturthi', date(2026, 10, 18): 'Navratri', date(2026, 10, 20): 'Dussehra', date(2026, 11, 8): 'Diwali', date(2026, 12, 25): 'Christmas',
            date(2027, 3, 22): 'Holi', date(2027, 9, 4): 'Ganesh Chaturthi', date(2027, 10, 9): 'Dussehra', date(2027, 10, 29): 'Diwali', date(2027, 12, 25): 'Christmas',
            date(2028, 3, 11): 'Holi', date(2028, 8, 23): 'Ganesh Chaturthi', date(2028, 9, 27): 'Dussehra', date(2028, 10, 17): 'Diwali', date(2028, 12, 25): 'Christmas',
            date(2029, 3, 1): 'Holi', date(2029, 9, 11): 'Ganesh Chaturthi', date(2029, 10, 16): 'Dussehra', date(2029, 11, 5): 'Diwali', date(2029, 12, 25): 'Christmas',
        }
        
        name = custom_festivals.get(target)
        if not name:
            name = self._holidays_for(target.year).get(target)
            
        is_fest = is_hol = 0
        holiday_name = None
        if isinstance(name, str):
            holiday_name = name
            festivals = ['Diwali', 'Holi', 'Dussehra', 'Eid', 'Christmas', 'Navratri', 'Ganesh Chaturthi', 'Maha Shivaratri', 'Deepavali']
            national = ['Republic Day', 'Independence Day', 'Gandhi Jayanti']
            is_fest = 1 if any(f in name for f in festivals) else 0
            is_hol = 1 if any(n in name for n in national) else 0
        return is_fest, is_hol, holiday_name

    def get_holiday_flags(self, target: date):
        is_fest, is_hol, _ = self.get_holiday_context(target)
        return is_fest, is_hol

    @staticmethod
    def get_season(month: int) -> str:
        if month in [12, 1, 2]: return 'Winter'
        if month in [3, 4, 5]: return 'Spring'
        if month in [6, 7, 8]: return 'Summer'
        return 'Autumn'

    def valid_options(self) -> dict:
        """Allowed categorical values (from the fitted encoders) - used to validate API input."""
        return {col: [str(c) for c in enc.classes_] for col, enc in self.encoders.items()}

    def _encode(self, df: pd.DataFrame) -> pd.DataFrame:
        for col, encoder in self.encoders.items():
            if col not in df.columns:
                continue
            classes = list(encoder.classes_)
            val = df[col].iloc[0]
            if val not in classes:
                fallback = 'None' if 'None' in [str(c) for c in classes] else classes[0]
                logging.warning("Unseen value %r for '%s'; falling back to %r", val, col, fallback)
                val = fallback
            df[col] = encoder.transform([val])
        return df

    def predict(
        self,
        publication_name, publication_category, price, customer_age,
        income_level, educational_background, occupation, region,
        promo_discount, special_events, previous_day_sales, previous_week_sales,
        festival_name=None, model_type=None, target_date: date | None = None,
    ) -> float:
        try:
            model_type = (model_type or self.settings.default_model).lower()
            if model_type not in VALID_MODELS:
                raise ValueError(f"model_type must be one of {VALID_MODELS}, got {model_type!r}")

            target_date = target_date or datetime.now().date()
            is_fest, is_hol = self.get_holiday_flags(target_date)

            row = {
                "Publication_Name": [publication_name],
                "Publication_Category": [publication_category],
                "Price": [price],
                "Customer_Age": [customer_age],
                "Income_Level": [income_level],
                "Educational_Background": [educational_background],
                "Occupation": [occupation],
                "Region": [region],
                "Day_of_Week": [target_date.weekday()],
                "Season": [self.get_season(target_date.month)],
                "Promo_Discount": [promo_discount],
                "Special_Events": [special_events],
                "Is_Weekend": [1 if target_date.weekday() >= 5 else 0],
                "Is_Holiday": [is_hol],
                "Is_Festival": [is_fest],
                "Festival_Name": [festival_name if festival_name and festival_name != 'None' else (holiday_name if is_fest else "None")],
                "Previous_Day_Sales": [previous_day_sales],
                "Previous_Week_Sales": [previous_week_sales],
            }
            df = self._encode(pd.DataFrame(row))
            df = df[self.feature_names]                 # exact training feature order
            scaled = self.scaler.transform(df)
            prediction = float(self.models[model_type].predict(scaled)[0])
            return max(0.0, prediction)                 # sales can't be negative
        except Exception as e:
            raise CustomException(e)

    def compare(self, **kwargs) -> dict:
        try:
            kwargs.pop("model_type", None)
            return {
                "svr": self.predict(**kwargs, model_type="svr"),
                "lgbm": self.predict(**kwargs, model_type="lgbm"),
            }
        except Exception as e:
            raise CustomException(e)

    # --- Seller-facing API: auto-detect the day + auto-fill history ---------
    def _assemble(self, inputs: dict, target_date: date | None):
        """Build the raw (un-encoded) 17-feature row + detected context + sales context."""
        if self.history is None:
            raise CustomException(RuntimeError("Sales history CSV is not loaded; cannot auto-fill lag features."))
        target_date = target_date or datetime.now().date()
        is_fest, is_hol, holiday_name = self.get_holiday_context(target_date)
        ctx = self.history.get_sales_context(inputs["publication_name"], inputs["region"], target_date, bool(is_fest))
        raw = {
            "Publication_Name": inputs["publication_name"],
            "Publication_Category": inputs["publication_category"],
            "Region": inputs["region"],
            "Customer_Age": inputs["customer_age"],
            "Income_Level": inputs["income_level"],
            "Educational_Background": inputs["educational_background"],
            "Occupation": inputs["occupation"],
            "Season": self.get_season(target_date.month),
            "Day_of_Week": target_date.weekday(),
            "Is_Weekend": 1 if target_date.weekday() >= 5 else 0,
            "Is_Holiday": is_hol,
            "Is_Festival": is_fest,
            "Festival_Name": inputs.get("festival_name", holiday_name) if is_fest else "None",
            "Special_Events": inputs["special_events"],
            "Promo_Discount": inputs["promo_discount"],
            "Price": inputs["price"],
            "Previous_Day_Sales": ctx["previous_day_sales"],
            "Previous_Week_Sales": ctx["previous_week_sales"],
        }
        detected = {
            "date": str(target_date),
            "season": raw["Season"],
            "day_name": target_date.strftime("%A"),
            "is_weekend": bool(raw["Is_Weekend"]),
            "is_holiday": bool(is_hol),
            "is_festival": bool(is_fest),
            "holiday_name": holiday_name,
        }
        return raw, detected, ctx

    def forecast(self, publication_name, publication_category, price, customer_age,
                 income_level, educational_background, occupation, region,
                 promo_discount, special_events, festival_name=None, target_date: date | None = None,
                 model_type=None) -> dict:
        """Auto-detect the day's context + auto-fill history for one target date, then predict."""
        try:
            model_type = (model_type or self.settings.default_model).lower()
            if model_type not in VALID_MODELS:
                raise ValueError(f"model_type must be one of {VALID_MODELS}, got {model_type!r}")
            inputs = dict(
                publication_name=publication_name, publication_category=publication_category,
                price=price, customer_age=customer_age, income_level=income_level,
                educational_background=educational_background, occupation=occupation,
                region=region, promo_discount=promo_discount, special_events=special_events,
                festival_name=festival_name,
            )
            raw, detected, ctx = self._assemble(inputs, target_date)
            df = self._encode(pd.DataFrame({k: [v] for k, v in raw.items()}))
            df = df[self.feature_names]
            scaled = self.scaler.transform(df)
            pred = max(0.0, float(self.models[model_type].predict(scaled)[0]))

            # Extract explainability from LightGBM model
            explanation = []
            lgbm = self.models.get("lgbm")
            if lgbm and hasattr(lgbm, "feature_importances_"):
                importances = lgbm.feature_importances_
                importance_pairs = list(zip(self.feature_names, importances))
                importance_pairs.sort(key=lambda x: x[1], reverse=True)
                explanation = [{"feature": f, "weight": float(w)} for f, w in importance_pairs[:5]]

            metrics = {}
            results_path = os.path.join(self.settings.artifacts_dir, "dual_model_results.json")
            if os.path.exists(results_path):
                import json
                with open(results_path, 'r') as f:
                    metrics = json.load(f)

            return {
                "predicted_sales_quantity": round(pred),
                "model_used": model_type,
                "detected": detected,
                "sales_context": ctx,
                "explainability": {
                    "top_features": explanation,
                    "metrics": metrics
                }
            }
        except Exception as e:
            raise CustomException(e)

    def build_record_row(self, publication_name, publication_category, price, customer_age,
                         income_level, educational_background, occupation, region,
                         promo_discount, special_events, actual_sales_quantity,
                         festival_name=None, target_date: date | None = None) -> dict:
        """Assemble a full canonical row (incl. actual Sales_Quantity) for appending to history."""
        try:
            inputs = dict(
                publication_name=publication_name, publication_category=publication_category,
                price=price, customer_age=customer_age, income_level=income_level,
                educational_background=educational_background, occupation=occupation,
                region=region, promo_discount=promo_discount, special_events=special_events,
                festival_name=festival_name,
            )
            target_date = target_date or datetime.now().date()
            raw, _, _ = self._assemble(inputs, target_date)
            row = dict(raw)
            row["Date"] = target_date.strftime("%Y-%m-%d")
            row["Sales_Quantity"] = int(actual_sales_quantity)
            return row
        except Exception as e:
            raise CustomException(e)
