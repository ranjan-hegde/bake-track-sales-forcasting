"""One-command, reproducible training entrypoint for the dual-model forecaster.

Runs the full offline pipeline against artifacts/synthetic_sales_data.csv:
    preprocess  ->  train SVR + LightGBM  ->  write models, scaler, encoders,
    feature order, metrics (dual_model_results.json) and metadata (model_metadata.json).

Usage:
    python -m src.pipelines.dual_train_pipeline
"""
import os
import sys

sys.path.append(os.getcwd())

from src.components.data_preprocessor import DataPreprocessor
from src.components.dual_model_trainer import DualModelTrainer
from src.components.dual_utils import logging


def run():
    logging.info(">>> DUAL TRAIN PIPELINE START <<<")
    DataPreprocessor().preprocess()
    results = DualModelTrainer().train_models()
    logging.info(">>> DUAL TRAIN PIPELINE COMPLETE <<<")
    return results


if __name__ == "__main__":
    run()
