import os
import sys
import pandas as pd
import joblib
from dataclasses import dataclass
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from src.components.dual_utils import CustomException, logging

@dataclass
class DataPreprocessorConfig:
    raw_data: str = os.path.join("artifacts", "synthetic_sales_data.csv")
    X_train_path: str = os.path.join("artifacts", "X_train.joblib")
    X_test_path: str = os.path.join("artifacts", "X_test.joblib")
    y_train_path: str = os.path.join("artifacts", "y_train.joblib")
    y_test_path: str = os.path.join("artifacts", "y_test.joblib")
    scaler_path: str = os.path.join("artifacts", "scaler.joblib")
    encoders_path: str = os.path.join("artifacts", "encoders.joblib")
    feature_names_path: str = os.path.join("artifacts", "feature_names.joblib")

class DataPreprocessor:
    def __init__(self):
        self.config = DataPreprocessorConfig()
        
    def preprocess(self):
        logging.info(">>> ADVANCED DATA PREPROCESSING STARTED <<<")
        try:
            os.makedirs("artifacts", exist_ok=True)
            
            # Load raw data
            logging.info(f"Loading data from {self.config.raw_data}")
            df = pd.read_csv(self.config.raw_data)
            logging.info(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")

            # pandas parses the literal string "None" as NaN on read. In this dataset
            # "None" is a real, meaningful category for Special_Events ("no special event"),
            # so restore it - otherwise the encoder learns NaN instead of "None" and every
            # no-event prediction silently falls back to an arbitrary event class.
            if 'Special_Events' in df.columns:
                df['Special_Events'] = df['Special_Events'].fillna('None')
            if 'Festival_Name' in df.columns:
                df['Festival_Name'] = df['Festival_Name'].fillna('None')
            
            # Label encode categorical features
            categorical_cols = [
                'Publication_Name', 'Publication_Category', 'Income_Level', 
                'Educational_Background', 'Occupation', 'Region', 'Season', 'Special_Events', 'Festival_Name'
            ]
            encoders = {}
            logging.info(f"Label encoding categorical columns: {categorical_cols}")
            for col in categorical_cols:
                if col in df.columns:
                    le = LabelEncoder()
                    df[col] = le.fit_transform(df[col].astype(str))
                    encoders[col] = le
                    logging.info(f"  Encoded '{col}': {list(le.classes_)}")
            
            # Drop unneeded/leakage columns
            if 'Date' in df.columns:
                df = df.drop('Date', axis=1)
            
            # Separate features and target
            logging.info("Separating features (X) and target (Sales_Quantity)")
            X = df.drop('Sales_Quantity', axis=1)
            y = df['Sales_Quantity']
            feature_names = X.columns.tolist()
            logging.info(f"Feature names: {feature_names}")
            
            # Train test split
            logging.info("Splitting data: 80% train, 20% test")
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            logging.info(f"Train size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")
            
            # Standard scaling on all features (both numeric and encoded categorical to normalize scale)
            logging.info("Applying StandardScaler to features")
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Save artifacts
            logging.info("Saving all preprocessing artifacts to artifacts/")
            joblib.dump(X_train_scaled, self.config.X_train_path)
            joblib.dump(X_test_scaled, self.config.X_test_path)
            joblib.dump(y_train.values, self.config.y_train_path)
            joblib.dump(y_test.values, self.config.y_test_path)
            joblib.dump(scaler, self.config.scaler_path)
            joblib.dump(encoders, self.config.encoders_path)
            joblib.dump(feature_names, self.config.feature_names_path)
            
            logging.info(">>> DATA PREPROCESSING COMPLETED <<<")
            print("✅ Advanced Data preprocessing completed successfully!")
            print(f"   Train: {X_train.shape[0]} rows | Test: {X_test.shape[0]} rows")
            print(f"   Features ({len(feature_names)} total): {feature_names}")
            
        except Exception as e:
            logging.error(f"Preprocessing failed: {e}")
            raise CustomException(e)

if __name__ == '__main__':
    preprocessor = DataPreprocessor()
    preprocessor.preprocess()
