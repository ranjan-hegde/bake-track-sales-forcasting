"""
Sales-history lookup for the seller-facing forecaster.

This is the "check last year / check past festivals" brain. Instead of asking the
seller to type yesterday's and last week's sales, we look them up from the
historical CSV for the same publication + region:

* Normal day  -> same date last year (seasonality), else most recent days on record.
* Festival day-> we ALSO surface the average of past festival days as an insight
  (`festival_reference`). The model itself captures the festival lift through the
  Is_Festival flag, so the lag features stay a realistic *baseline* - we don't feed
  the festival average back in as "yesterday" (that would double-count the spike).

It also appends a seller's real recorded sale back into the CSV so the models can
retrain on genuine data.
"""
import os

import pandas as pd

from src.components.config import settings
from src.components.dual_utils import CustomException, logging

# Canonical training column order - the append path must match this exactly.
CANONICAL_COLUMNS = [
    "Date", "Publication_Name", "Publication_Category", "Region", "Customer_Age",
    "Income_Level", "Educational_Background", "Occupation", "Season", "Day_of_Week",
    "Is_Weekend", "Is_Holiday", "Is_Festival", "Festival_Name", "Special_Events", "Promotion", "Price",
    "Previous_Day_Sales", "Previous_Week_Sales", "Sales_Quantity",
]


class HistoryLookup:
    def __init__(self, csv_path: str | None = None):
        self.csv_path = csv_path or settings.dataset_path
        self._load()

    def _load(self):
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"Sales history not found at {self.csv_path}. Generate the dataset first.")
        df = pd.read_csv(self.csv_path)
        # pandas reads the literal "None" as NaN; restore it (same fix as the preprocessor).
        if "Special_Events" in df.columns:
            df["Special_Events"] = df["Special_Events"].fillna("None")
        df["Date"] = pd.to_datetime(df["Date"])
        self.df = df

    def get_sales_context(self, publication_name: str, region: str, target_date, is_festival: bool) -> dict:
        """Return {previous_day_sales, previous_week_sales, source[, festival_reference, festival_days]}."""
        try:
            target = pd.Timestamp(target_date)
            sub = self.df[
                (self.df["Publication_Name"] == publication_name) & (self.df["Region"] == region)
            ].sort_values("Date")

            if sub.empty:  # unknown pub/region combo - fall back to the global average
                overall = int(round(self.df["Sales_Quantity"].mean()))
                return {"previous_day_sales": overall, "previous_week_sales": overall,
                        "source": "overall average (no history for this publication + region)"}

            last_year = target - pd.DateOffset(years=1)
            ly = sub[sub["Date"] == last_year]
            if not ly.empty:
                pday = int(round(ly["Sales_Quantity"].iloc[0]))
                wk = sub[(sub["Date"] > last_year - pd.Timedelta(days=7)) & (sub["Date"] <= last_year)]
                pweek = int(round(wk["Sales_Quantity"].mean())) if not wk.empty else pday
                source = f"same date last year ({last_year.date()})"
            else:
                before = sub[sub["Date"] < target]
                anchor = before if not before.empty else sub
                pday = int(round(anchor["Sales_Quantity"].iloc[-1]))
                recent = anchor.tail(7)
                pweek = int(round(recent["Sales_Quantity"].mean()))
                source = f"most recent {len(recent)} day(s) on record"

            ctx = {"previous_day_sales": pday, "previous_week_sales": pweek, "source": source}

            if is_festival:  # informational insight for the seller (not fed back as a lag)
                fest = sub[sub["Is_Festival"] == 1]
                if not fest.empty:
                    ctx["festival_reference"] = int(round(fest["Sales_Quantity"].mean()))
                    ctx["festival_days"] = int(len(fest))
            return ctx
        except Exception as e:
            raise CustomException(e)

    def append_actual(self, row: dict) -> int:
        """Append one fully-formed row (all CANONICAL_COLUMNS) and return the new row count."""
        try:
            missing = [c for c in CANONICAL_COLUMNS if c not in row]
            if missing:
                raise ValueError(f"Row is missing required columns: {missing}")
            new_df = pd.DataFrame([{c: row[c] for c in CANONICAL_COLUMNS}], columns=CANONICAL_COLUMNS)
            write_header = not os.path.exists(self.csv_path)
            new_df.to_csv(self.csv_path, mode="a", header=write_header, index=False)
            logging.info("Appended a recorded sale to %s", self.csv_path)
            self._load()
            return len(self.df)
        except Exception as e:
            raise CustomException(e)
