import pandas as pd
from fastapi.testclient import TestClient
from fastapi import HTTPException

import main

client = TestClient(main.app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cashflow_endpoint(monkeypatch):
    df = pd.DataFrame([
        {"date": "2024-06-01", "amount": 120.0, "category": "salary"},
        {"date": "2024-06-20", "amount": -40.0, "category": "food"},
    ])
    monkeypatch.setattr(main, "fetch_transactions", lambda user_id: df)

    response = client.get("/analytics/cashflow?user_id=test-user")
    assert response.status_code == 200
    assert response.json() == [
        {"month": "2024-06", "category": "food", "total": -40.0, "count": 1},
        {"month": "2024-06", "category": "salary", "total": 120.0, "count": 1},
    ]


def test_spending_endpoint(monkeypatch):
    df = pd.DataFrame([
        {"date": "2024-07-10", "amount": -50.0, "category": "dining"},
        {"date": "2024-07-11", "amount": -30.0, "category": "dining"},
        {"date": "2024-07-12", "amount": 100.0, "category": "refund"},
    ])
    monkeypatch.setattr(main, "fetch_transactions", lambda user_id: df)

    response = client.get("/analytics/spending?user_id=test-user")
    assert response.status_code == 200
    assert response.json() == [
        {"month": "2024-07", "category": "dining", "total_spent": 80.0, "count": 2},
    ]


def test_trends_endpoint(monkeypatch):
    df = pd.DataFrame([
        {"date": "2024-08-01", "amount": 75.0},
        {"date": "2024-08-15", "amount": -25.0},
        {"date": "2024-09-01", "amount": 130.0},
    ])
    monkeypatch.setattr(main, "fetch_transactions", lambda user_id: df)

    response = client.get("/analytics/trends?user_id=test-user")
    assert response.status_code == 200
    assert response.json() == [
        {"month": "2024-08", "total_amount": 50.0, "transaction_count": 2},
        {"month": "2024-09", "total_amount": 130.0, "transaction_count": 1},
    ]


def test_fetch_transactions_error(monkeypatch):
    class FakeResponse:
        def __init__(self):
            self.error = "bad request"
            self.data = []

    class FakeTable:
        def select(self, *_):
            return self

        def eq(self, *_):
            return self

        def execute(self):
            return FakeResponse()

    class FakeSupabaseClient:
        def table(self, *_):
            return FakeTable()

    monkeypatch.setattr(main, "supabase", FakeSupabaseClient())

    try:
        main.fetch_transactions("user")
        assert False, "Expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 502
        assert "Supabase query failed" in exc.detail


def test_fetch_transactions_empty_response(monkeypatch):
    class FakeResponse:
        def __init__(self):
            self.error = None
            self.data = []

    class FakeTable:
        def select(self, *_):
            return self

        def eq(self, *_):
            return self

        def execute(self):
            return FakeResponse()

    class FakeSupabaseClient:
        def table(self, *_):
            return FakeTable()

    monkeypatch.setattr(main, "supabase", FakeSupabaseClient())
    df = main.fetch_transactions("user")

    assert df.empty
    assert list(df.columns) == ["date", "amount", "category"]


def test_fetch_transactions_invalid_response_data(monkeypatch):
    class FakeResponse:
        def __init__(self):
            self.error = None
            self.data = None

    class FakeTable:
        def select(self, *_):
            return self

        def eq(self, *_):
            return self

        def execute(self):
            return FakeResponse()

    class FakeSupabaseClient:
        def table(self, *_):
            return FakeTable()

    monkeypatch.setattr(main, "supabase", FakeSupabaseClient())

    try:
        main.fetch_transactions("user")
        assert False, "Expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 502
        assert exc.detail == "Supabase returned an invalid response"


def test_fetch_transactions_no_client(monkeypatch):
    monkeypatch.setattr(main, "supabase", None)

    try:
        main.fetch_transactions("user")
        assert False, "Expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert exc.detail == "Supabase client is unavailable"


def test_cashflow_endpoint_empty(monkeypatch):
    monkeypatch.setattr(main, "fetch_transactions", lambda user_id: pd.DataFrame(columns=["date", "amount", "category"]))
    response = client.get("/analytics/cashflow?user_id=test-user")
    assert response.status_code == 200
    assert response.json() == []


def test_spending_endpoint_empty(monkeypatch):
    monkeypatch.setattr(main, "fetch_transactions", lambda user_id: pd.DataFrame(columns=["date", "amount", "category"]))
    response = client.get("/analytics/spending?user_id=test-user")
    assert response.status_code == 200
    assert response.json() == []


def test_trends_endpoint_empty(monkeypatch):
    monkeypatch.setattr(main, "fetch_transactions", lambda user_id: pd.DataFrame(columns=["date", "amount", "category"]))
    response = client.get("/analytics/trends?user_id=test-user")
    assert response.status_code == 200
    assert response.json() == []
