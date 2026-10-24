"""Unit tests for HistoryLookup - the auto-fill "check last year / past festivals" brain.

These build tiny temp CSVs, so they run WITHOUT trained artifacts and never touch
the real artifacts/synthetic_sales_data.csv.

Run:  pip install -r requirements-dev.txt && pytest
"""
import pandas as pd
import pytest

from src.components.history_lookup import CANONICAL_COLUMNS, HistoryLookup


def _row(**overrides):
    """A full canonical row with sane defaults; override only what a test cares about."""
    base = dict(
        Date="2024-01-01", Publication_Name="TestPub", Publication_Category="News",
        Region="North", Customer_Age=35, Income_Level="Medium",
        Educational_Background="Bachelor", Occupation="Professional", Season="Winter",
        Day_of_Week=0, Is_Weekend=0, Is_Holiday=0, Is_Festival=0, Special_Events="None",
        Promotion=0, Price=5.0, Previous_Day_Sales=500, Previous_Week_Sales=500,
        Sales_Quantity=500,
    )
    base.update(overrides)
    return base


def _write_csv(tmp_path, rows):
    csv = tmp_path / "history.csv"
    pd.DataFrame(rows, columns=CANONICAL_COLUMNS).to_csv(csv, index=False)
    return str(csv)


def test_festival_reference_is_mean_of_past_festival_days(tmp_path):
    rows = [
        _row(Date="2024-01-01", Is_Festival=1, Sales_Quantity=1000),
        _row(Date="2024-02-01", Is_Festival=1, Sales_Quantity=1200),
        _row(Date="2024-03-01", Is_Festival=0, Sales_Quantity=500),
    ]
    hist = HistoryLookup(_write_csv(tmp_path, rows))
    ctx = hist.get_sales_context("TestPub", "North", pd.Timestamp("2024-06-01"), is_festival=True)

    assert ctx["festival_reference"] == 1100      # mean(1000, 1200)
    assert ctx["festival_days"] == 2
    # The lag baseline must NOT be the festival average (that would double-count the lift).
    assert ctx["previous_day_sales"] != 1100


def test_no_festival_reference_on_plain_day(tmp_path):
    rows = [_row(Date="2024-03-01", Is_Festival=0, Sales_Quantity=500)]
    hist = HistoryLookup(_write_csv(tmp_path, rows))
    ctx = hist.get_sales_context("TestPub", "North", pd.Timestamp("2024-06-01"), is_festival=False)
    assert "festival_reference" not in ctx


def test_unknown_pub_region_falls_back_to_overall_mean(tmp_path):
    rows = [_row(Sales_Quantity=400), _row(Sales_Quantity=600)]
    hist = HistoryLookup(_write_csv(tmp_path, rows))
    ctx = hist.get_sales_context("Ghost Paper", "West", pd.Timestamp("2024-06-01"), is_festival=False)
    assert ctx["previous_day_sales"] == 500       # mean(400, 600)
    assert "overall average" in ctx["source"]


def test_append_actual_increments_row_count(tmp_path):
    rows = [_row(), _row(Date="2024-01-02")]
    hist = HistoryLookup(_write_csv(tmp_path, rows))
    assert len(hist.df) == 2

    new_total = hist.append_actual(_row(Date="2024-01-03", Sales_Quantity=777))
    assert new_total == 3
    # Re-read from disk to prove it was persisted, not just held in memory.
    assert len(pd.read_csv(hist.csv_path)) == 3


def test_append_actual_rejects_incomplete_row(tmp_path):
    hist = HistoryLookup(_write_csv(tmp_path, [_row()]))
    with pytest.raises(Exception):
        hist.append_actual({"Date": "2024-01-03", "Sales_Quantity": 100})  # missing columns
