from datetime import date

import pytest

from alantra_backend.fixtures import load_sandbox_snapshot
from alantra_backend.transformations.core import (
    aggregate_all_transactions,
    mom_delta,
    monthly_net_flow,
    reconstruct_balance_history,
    runway_months,
    trailing_burn,
)


@pytest.fixture
def sandbox():
    return load_sandbox_snapshot()


def test_transactions_are_sign_normalized(sandbox):
    txs = aggregate_all_transactions(sandbox.snapshots)

    # Sandbox includes inflows (Stripe payouts, intercompany) and outflows
    # (payroll, rent, SaaS). After normalisation we must have both signs.
    assert any(t.amount > 0 for t in txs), "expected at least one inflow"
    assert any(t.amount < 0 for t in txs), "expected at least one outflow"


def test_trailing_burn_positive_for_us_checking(sandbox):
    us_checking = next(s for s in sandbox.snapshots if s.account.id == "plaid_us_checking")
    burn = trailing_burn(us_checking.transactions, as_of=sandbox.anchor, months=3)
    # This account only sees outflows, so burn must be strongly positive.
    assert burn > 100_000


def test_trailing_burn_negative_means_profitable(sandbox):
    savings = next(s for s in sandbox.snapshots if s.account.id == "plaid_us_savings")
    burn = trailing_burn(savings.transactions, as_of=sandbox.anchor, months=3)
    # Savings account only sees Stripe payout inflows → negative burn (= profit).
    assert burn < 0


def test_runway_edges():
    assert runway_months(0, 1000) == 0.0
    assert runway_months(1000, 0) == 9999.0
    assert runway_months(12000, 1000) == 12.0


def test_mom_delta():
    assert mom_delta(110, 100) == pytest.approx(0.1)
    assert mom_delta(0, 0) == 0.0
    assert mom_delta(50, 0) == float("inf")
    assert mom_delta(-50, 0) == float("-inf")


def test_balance_history_walks_back_correctly(sandbox):
    us_checking = next(s for s in sandbox.snapshots if s.account.id == "plaid_us_checking")
    hist = reconstruct_balance_history(
        us_checking.account.balance,
        us_checking.transactions,
        as_of=sandbox.anchor,
        start=sandbox.anchor.replace(year=sandbox.anchor.year - 1),
    )
    # The last entry must equal the current balance (we walk backwards).
    assert hist[-1] == (sandbox.anchor, us_checking.account.balance)
    # Earliest balance must be greater than current (account has been burning).
    assert hist[0][1] > us_checking.account.balance


def test_monthly_net_flow_month_count(sandbox):
    flows = monthly_net_flow(aggregate_all_transactions(sandbox.snapshots))
    # 12 months of generated data plus sometimes a partial overlap — expect >= 12.
    assert len(flows) >= 12
