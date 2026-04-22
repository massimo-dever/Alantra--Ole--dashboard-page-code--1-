import pandas as pd
from transformations.cashflow import compute_monthly_cashflow
from transformations.spending import compute_spending_by_category
from transformations.trends import compute_trends


def test_compute_monthly_cashflow_empty():
    df = pd.DataFrame()
    result = compute_monthly_cashflow(df)

    assert result.empty
    assert list(result.columns) == ["month", "category", "total", "count"]


def test_compute_monthly_cashflow_standard():
    df = pd.DataFrame([
        {"date": "2024-01-10", "amount": 100.0, "category": "income"},
        {"date": "2024-01-20", "amount": -40.0, "category": "food"},
        {"date": "2024-02-05", "amount": 200.0, "category": "income"},
    ])
    result = compute_monthly_cashflow(df)
    assert result.to_dict(orient="records") == [
        {"month": "2024-01", "category": "food", "total": -40.0, "count": 1},
        {"month": "2024-01", "category": "income", "total": 100.0, "count": 1},
        {"month": "2024-02", "category": "income", "total": 200.0, "count": 1},
    ]


def test_compute_spending_by_category_empty():
    df = pd.DataFrame()
    result = compute_spending_by_category(df)

    assert result.empty
    assert list(result.columns) == ["month", "category", "total_spent", "count"]


def test_compute_spending_by_category_standard():
    df = pd.DataFrame([
        {"date": "2024-03-01", "amount": -20.0, "category": "groceries"},
        {"date": "2024-03-02", "amount": -10.0, "category": "groceries"},
        {"date": "2024-03-05", "amount": 50.0, "category": "income"},
    ])
    result = compute_spending_by_category(df)
    assert result.to_dict(orient="records") == [
        {"month": "2024-03", "category": "groceries", "total_spent": 30.0, "count": 2},
    ]


def test_compute_trends_empty():
    df = pd.DataFrame()
    result = compute_trends(df)

    assert result.empty
    assert list(result.columns) == ["month", "total_amount", "transaction_count"]


def test_compute_trends_standard():
    df = pd.DataFrame([
        {"date": "2024-04-01", "amount": 100.0},
        {"date": "2024-04-15", "amount": -30.0},
        {"date": "2024-05-01", "amount": 200.0},
    ])
    result = compute_trends(df)
    assert result.to_dict(orient="records") == [
        {"month": "2024-04", "total_amount": 70.0, "transaction_count": 2},
        {"month": "2024-05", "total_amount": 200.0, "transaction_count": 1},
    ]


def test_compute_monthly_cashflow_invalid_data():
    df = pd.DataFrame([
        {"date": "2024-01-05", "amount": "100", "category": "salary"},
        {"date": "invalid-date", "amount": 50, "category": "food"},
        {"date": "2024-01-10", "amount": "not-a-number", "category": "food"},
    ])
    result = compute_monthly_cashflow(df)

    assert result.to_dict(orient="records") == [
        {"month": "2024-01", "category": "salary", "total": 100.0, "count": 1},
    ]


def test_compute_monthly_cashflow_missing_category_column():
    df = pd.DataFrame([
        {"date": "2024-02-01", "amount": 50.0},
        {"date": "2024-02-15", "amount": 75.0},
    ])
    result = compute_monthly_cashflow(df)

    assert result.to_dict(orient="records") == [
        {"month": "2024-02", "category": "unknown", "total": 125.0, "count": 2},
    ]


def test_compute_spending_by_category_missing_category_column():
    df = pd.DataFrame([
        {"date": "2024-03-01", "amount": -20.0},
        {"date": "2024-03-05", "amount": -30.0},
    ])
    result = compute_spending_by_category(df)

    assert result.to_dict(orient="records") == [
        {"month": "2024-03", "category": "unknown", "total_spent": 50.0, "count": 2},
    ]


def test_compute_trends_missing_columns():
    df = pd.DataFrame([
        {"date": "2024-04-01"},
        {"amount": 100.0},
    ])
    result = compute_trends(df)

    assert result.empty
    assert list(result.columns) == ["month", "total_amount", "transaction_count"]
