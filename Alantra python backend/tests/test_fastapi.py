"""Basic end-to-end smoke test: hit every FastAPI endpoint with the fixture
loaded and confirm we get a 200 with the expected top-level keys."""

import importlib

import pytest

# Force the fallback path: no Supabase secrets -> uses the Plaid sandbox fixture.
@pytest.fixture(autouse=True)
def _no_supabase(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    mod = importlib.import_module("alantra_backend.app")
    return TestClient(mod.app)


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_command_center(client):
    r = client.get("/command-center")
    assert r.status_code == 200
    body = r.json()
    assert {"as_of", "accounts", "runway_series", "stats"} <= set(body.keys())


def test_treasury(client):
    r = client.get("/treasury?months_back=3")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"as_of", "aggregated_stats", "per_account_stats", "total_cash_series", "alerts"}


def test_cash_calendar(client):
    r = client.get("/cash-calendar?horizon_days=90&distance=weekly")
    assert r.status_code == 200
    body = r.json()
    assert body["horizon_days"] == 90
    assert body["distance"] == "weekly"


def test_cash_intelligence(client):
    r = client.get("/cash-intelligence?horizon_days=180&distance=monthly")
    assert r.status_code == 200
    body = r.json()
    assert body["horizon_days"] == 180
    assert body["distance"] == "monthly"
    assert set(body["series"].keys()) == {"total_cash", "cash_growth", "efficiency_pct", "spend"}


def test_forecast(client):
    r = client.get("/forecast?horizon_months=6&selected_scenario=Upside")
    assert r.status_code == 200
    body = r.json()
    assert body["horizon_months"] == 6
    assert body["selected_scenario"] == "Upside"


def test_recurring_outflow(client):
    r = client.get("/recurring-outflow")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"as_of", "main_stats", "series_by_category", "category_breakdown_pct", "payments"}


@pytest.mark.parametrize("horizon", [30, 90, 180, 365])
def test_cash_calendar_accepts_spec_horizons(client, horizon):
    r = client.get(f"/cash-calendar?horizon_days={horizon}")
    assert r.status_code == 200, r.text
    assert r.json()["horizon_days"] == horizon


def test_cash_calendar_rejects_off_spec_horizon(client):
    r = client.get("/cash-calendar?horizon_days=45")
    assert r.status_code == 400


def test_cash_intelligence_rejects_off_spec_horizon(client):
    r = client.get("/cash-intelligence?horizon_days=120")
    assert r.status_code == 400


def test_forecast_includes_zero_reference_line(client):
    r = client.get("/forecast")
    assert r.status_code == 200
    body = r.json()
    # Spec: dotted horizontal line at 0$.
    assert body["reference_lines"] == {"zero": 0}


def test_command_center_window_filters(client):
    for window in ("1m", "3m", "ytd", "all"):
        r = client.get(f"/command-center?window={window}")
        assert r.status_code == 200, r.text
        assert r.json()["runway_series"]["window"] == window


def test_command_center_account_filter(client):
    # Pin to a specific account; sandbox uses these IDs.
    r = client.get("/command-center?account_id=plaid_uk_checking")
    assert r.status_code == 200
    assert r.json()["runway_series"]["account_id"] == "plaid_uk_checking"
