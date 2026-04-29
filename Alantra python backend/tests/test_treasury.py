import pytest

from alantra_backend.fixtures import load_sandbox_snapshot
from alantra_backend.transformations.treasury import (
    aggregated_stats,
    build_treasury_alerts,
    build_treasury_payload,
    per_account_stats,
    total_cash_series,
)


@pytest.fixture
def sandbox():
    return load_sandbox_snapshot()


def test_aggregated_stats(sandbox):
    stats = aggregated_stats(sandbox.snapshots, as_of=sandbox.anchor)
    # Sandbox balances: 420k + 1.8M + 90k + 310k = 2.62M
    assert stats.total_cash == pytest.approx(420_000 + 1_800_000 + 90_000 + 310_000)
    # cash at work = the savings account only
    assert stats.cash_at_work_pct == pytest.approx(1_800_000 / 2_620_000 * 100, rel=1e-3)
    # best APY from savings
    assert stats.best_apy == 0.048


def test_per_account_stats_covers_every_account(sandbox):
    rows = per_account_stats(sandbox.snapshots, as_of=sandbox.anchor)
    assert {r.account_id for r in rows} == {a.account.id for a in sandbox.snapshots}


def test_total_cash_series_shape(sandbox):
    series = total_cash_series(sandbox.snapshots, as_of=sandbox.anchor, months_back=3)
    assert series
    assert {"date", "total_cash"} <= set(series[0].keys())
    # Last point must equal today's combined balance.
    assert series[-1]["total_cash"] == pytest.approx(2_620_000)


def test_alerts_include_runway_imbalance_apy_and_target(sandbox):
    alerts = build_treasury_alerts(sandbox.snapshots, as_of=sandbox.anchor)
    types = {a.type for a in alerts}
    # UK is under its target balance, will trip target_shortfall.
    assert "target_shortfall" in types

    # US savings vastly out-runways UK checking (inf vs ~2mo) -> imbalance alert.
    imbalances = [a for a in alerts if a.type == "runway_imbalance"]
    assert imbalances, "expected at least one runway_imbalance alert"
    # The suggested transfer must move money from a high-runway account.
    ex = imbalances[0]
    assert ex.details["transfer_amount"] > 0
    assert ex.details["from_account_id"] != ex.details["to_account_id"]


def test_apy_opportunity_alert_present(sandbox):
    # We tune the EU account in the fixture to have >12mo of runway at a low
    # APY. It must trigger an APY sweep suggestion into the US savings account.
    alerts = build_treasury_alerts(sandbox.snapshots, as_of=sandbox.anchor)
    apy = [a for a in alerts if a.type == "apy_opportunity"]
    # Expect at least the EU operating account (runway > 12mo, APY 0.4%) to fire.
    assert apy, "expected at least one apy_opportunity alert"
    best = apy[0]
    assert best.details["sweep_amount"] > 0
    assert best.details["annual_yield_uplift"] > 0


def test_build_treasury_payload_keys(sandbox):
    payload = build_treasury_payload(sandbox.snapshots, as_of=sandbox.anchor)
    assert set(payload.keys()) == {
        "as_of",
        "aggregated_stats",
        "per_account_stats",
        "total_cash_series",
        "alerts",
    }
