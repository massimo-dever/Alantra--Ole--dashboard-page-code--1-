from datetime import date

import pytest

from alantra_backend.fixtures import load_sandbox_snapshot
from alantra_backend.transformations.command_center import (
    build_command_center_payload,
    per_account_runway,
    runway_series,
)


@pytest.fixture
def sandbox():
    return load_sandbox_snapshot()


def test_per_account_runway_has_all_accounts(sandbox):
    rows = per_account_runway(sandbox.snapshots, as_of=sandbox.anchor)
    assert len(rows) == len(sandbox.snapshots)
    ids = {r.account_id for r in rows}
    assert ids == {"plaid_us_checking", "plaid_us_savings", "plaid_uk_checking", "plaid_eu_checking"}


def test_runway_for_burning_account_is_finite(sandbox):
    rows = {r.account_id: r for r in per_account_runway(sandbox.snapshots, as_of=sandbox.anchor)}
    us = rows["plaid_us_checking"]
    assert us.burn_per_month > 0
    assert 0 < us.runway_months < 20  # burning hard, should be short
    uk = rows["plaid_uk_checking"]
    assert uk.burn_per_month > 0
    assert uk.runway_months < us.runway_months or uk.runway_months < 15


def test_savings_account_has_infinite_runway(sandbox):
    rows = {r.account_id: r for r in per_account_runway(sandbox.snapshots, as_of=sandbox.anchor)}
    savings = rows["plaid_us_savings"]
    # Savings is pure inflow -> burn <= 0 -> runway == 9999 sentinel
    assert savings.burn_per_month <= 0
    assert savings.runway_months == 9999.0


def test_runway_series_defaults_to_lowest_account(sandbox):
    rows = per_account_runway(sandbox.snapshots, as_of=sandbox.anchor)
    lowest = min(rows, key=lambda r: r.runway_months)
    series = runway_series(sandbox.snapshots, as_of=sandbox.anchor, window="3m")
    assert series["account_id"] == lowest.account_id
    assert len(series["series"]) >= 90   # ~90 daily points
    # Graph points must have all three fields.
    pt = series["series"][0]
    assert set(pt.keys()) == {"date", "balance", "burn_per_month", "runway_months"}


@pytest.mark.parametrize("window", ["1m", "3m", "ytd", "all"])
def test_runway_series_windows(sandbox, window):
    series = runway_series(sandbox.snapshots, as_of=sandbox.anchor, window=window)
    assert series["series"], f"Series empty for window {window}"


def test_full_payload_shape(sandbox):
    payload = build_command_center_payload(sandbox.snapshots, as_of=sandbox.anchor)
    assert set(payload.keys()) == {"as_of", "accounts", "runway_series", "stats"}
    stats = payload["stats"]
    # All expected KPI fields present.
    assert set(stats.keys()) == {
        "nrr_pct",
        "rule_of_40",
        "burn_multiple",
        "magic_number",
        "gross_margin_pct",
        "recurring_out_per_month",
        "tightest_day_amount",
        "tightest_day_date",
        "approvals_pending_amount",
    }
    # Pending transaction in the sandbox must feed approvals_pending.
    assert stats["approvals_pending_amount"] == pytest.approx(24_000.0)
    # Recurring $/mo sums to a sensible positive number.
    assert stats["recurring_out_per_month"] > 0
    # Tightest day has a date (we inspected 90 days, sandbox spans >12 months).
    assert stats["tightest_day_date"] is not None
