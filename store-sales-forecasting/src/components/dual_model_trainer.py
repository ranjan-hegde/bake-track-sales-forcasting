import os
import sys
import json
import time
import joblib
import logging
import platform
from datetime import datetime, timezone
from dataclasses import dataclass

import numpy as np
import sklearn
import lightgbm
from sklearn.svm import SVR
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

from src.components.dual_utils import CustomException

MODEL_VERSION = "3.0.0"


@dataclass
class DualModelTrainerConfig:
    x_train_path: str = os.path.join("artifacts", "X_train.joblib")
    x_test_path: str = os.path.join("artifacts", "X_test.joblib")
    y_train_path: str = os.path.join("artifacts", "y_train.joblib")
    y_test_path: str = os.path.join("artifacts", "y_test.joblib")
    feature_names_path: str = os.path.join("artifacts", "feature_names.joblib")
    svr_model_path: str = os.path.join("artifacts", "svr_model.joblib")
    lgbm_model_path: str = os.path.join("artifacts", "lgbm_model.joblib")
    results_path: str = os.path.join("artifacts", "dual_model_results.json")
    metadata_path: str = os.path.join("artifacts", "model_metadata.json")

class DualModelTrainer:
    def __init__(self):
        self.config = DualModelTrainerConfig()

    def train_models(self):
        try:
            logging.info(">>> ADVANCED DUAL MODEL TRAINING STARTED <<<")
            
            # Load preprocessed data
            logging.info("Loading preprocessed training and test data")
            X_train = joblib.load(self.config.x_train_path)
            X_test = joblib.load(self.config.x_test_path)
            y_train = joblib.load(self.config.y_train_path)
            y_test = joblib.load(self.config.y_test_path)
            
            print(f"📊 Data loaded: Train={X_train.shape[0]} rows, Test={X_test.shape[0]} rows")
            results = {}

            # --- SVR Training ---
            print("\n🔧 Training SVR model (on FULL dataset)...")
            logging.info("Starting SVR training on FULL dataset")
            start_time = time.time()
            
            # Train on full dataset since it's only 14.6k rows!
            svr_model = SVR(kernel='rbf', C=100, epsilon=0.1)
            svr_model.fit(X_train, y_train)
            
            svr_time = round(time.time() - start_time, 2)
            logging.info(f"SVR training completed in {svr_time}s")
            
            svr_preds = svr_model.predict(X_test)
            results["SVR"] = {
                "MSE": round(mean_squared_error(y_test, svr_preds), 4),
                "MAE": round(mean_absolute_error(y_test, svr_preds), 4),
                "R2": round(r2_score(y_test, svr_preds), 4),
                "Training_Time_Seconds": svr_time,
                "Training_Samples": X_train.shape[0]
            }
            print(f"   ✅ SVR done in {svr_time}s | R²={results['SVR']['R2']} | MAE={results['SVR']['MAE']}")
            logging.info(f"SVR metrics: {results['SVR']}")
            
            # --- LightGBM Training ---
            print("\n🔧 Training LightGBM model (on FULL dataset)...")
            logging.info("Starting LightGBM training on full dataset")
            start_time = time.time()
            
            lgbm_model = LGBMRegressor(
                n_estimators=500, 
                learning_rate=0.05, 
                num_leaves=31, 
                verbosity=-1, 
                random_state=42
            )
            lgbm_model.fit(X_train, y_train)
            
            lgbm_time = round(time.time() - start_time, 2)
            logging.info(f"LightGBM training completed in {lgbm_time}s")
            
            lgbm_preds = lgbm_model.predict(X_test)
            results["LightGBM"] = {
                "MSE": round(mean_squared_error(y_test, lgbm_preds), 4),
                "MAE": round(mean_absolute_error(y_test, lgbm_preds), 4),
                "R2": round(r2_score(y_test, lgbm_preds), 4),
                "Training_Time_Seconds": lgbm_time,
                "Training_Samples": X_train.shape[0]
            }
            print(f"   ✅ LightGBM done in {lgbm_time}s | R²={results['LightGBM']['R2']} | MAE={results['LightGBM']['MAE']}")
            logging.info(f"LightGBM metrics: {results['LightGBM']}")
            
            # --- Save Models and Results ---
            os.makedirs("artifacts", exist_ok=True)
            joblib.dump(svr_model, self.config.svr_model_path)
            joblib.dump(lgbm_model, self.config.lgbm_model_path)

            with open(self.config.results_path, "w") as f:
                json.dump(results, f, indent=4)

            # --- Model metadata / versioning (production traceability) ---
            best_model = min(results, key=lambda m: results[m]["MAE"])
            feature_names = joblib.load(self.config.feature_names_path)
            metadata = {
                "model_version": MODEL_VERSION,
                "trained_at_utc": datetime.now(timezone.utc).isoformat(),
                "best_model": best_model,
                "n_features": len(feature_names),
                "feature_names": feature_names,
                "train_samples": int(X_train.shape[0]),
                "test_samples": int(X_test.shape[0]),
                "metrics": results,
                "library_versions": {
                    "python": platform.python_version(),
                    "scikit_learn": sklearn.__version__,
                    "lightgbm": lightgbm.__version__,
                    "numpy": np.__version__,
                },
            }
            with open(self.config.metadata_path, "w") as f:
                json.dump(metadata, f, indent=4)

            logging.info(">>> ADVANCED DUAL MODEL TRAINING COMPLETED <<<")
            print(f"\n🎉 Both models saved to artifacts/ | best (lowest MAE): {best_model}")
            print(f"   Metadata written to {self.config.metadata_path}")

            return results
            
        except Exception as e:
            logging.error(f"Model training failed: {e}")
            raise CustomException(e)

if __name__ == '__main__':
    trainer = DualModelTrainer()
    trainer.train_models()
