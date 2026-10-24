"""
Centralised, environment-driven configuration for the dual-model runtime.

Every runtime path and tunable is read from an environment variable with a sane
default, so the same image runs unchanged in dev, CI, and production.
"""
import os
from dataclasses import dataclass

# Optional: load a local .env file if python-dotenv is available (no-op otherwise).
try:  # pragma: no cover
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover
    pass


@dataclass(frozen=True)
class Settings:
    artifacts_dir: str
    default_model: str
    log_level: str
    api_host: str
    api_port: int
    mongo_uri: str
    mongo_db: str
    mongo_collection: str

    @property
    def svr_model_path(self) -> str:
        return os.path.join(self.artifacts_dir, "svr_model.joblib")

    @property
    def lgbm_model_path(self) -> str:
        return os.path.join(self.artifacts_dir, "lgbm_model.joblib")

    @property
    def scaler_path(self) -> str:
        return os.path.join(self.artifacts_dir, "scaler.joblib")

    @property
    def encoders_path(self) -> str:
        return os.path.join(self.artifacts_dir, "encoders.joblib")

    @property
    def feature_names_path(self) -> str:
        return os.path.join(self.artifacts_dir, "feature_names.joblib")

    @property
    def metadata_path(self) -> str:
        return os.path.join(self.artifacts_dir, "model_metadata.json")

    @property
    def dataset_path(self) -> str:
        return os.path.join(self.artifacts_dir, "synthetic_sales_data.csv")


def load_settings() -> "Settings":
    return Settings(
        artifacts_dir=os.getenv("ARTIFACTS_DIR", "artifacts"),
        default_model=os.getenv("DEFAULT_MODEL", "lgbm").lower(),
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        api_host=os.getenv("API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("API_PORT", "8000")),
        mongo_uri=os.getenv("MONGO_URI", ""),
        mongo_db=os.getenv("MONGO_DB", "shop"),
        mongo_collection=os.getenv("MONGO_SALES_COLLECTION", "sales_records"),
    )


settings = load_settings()
