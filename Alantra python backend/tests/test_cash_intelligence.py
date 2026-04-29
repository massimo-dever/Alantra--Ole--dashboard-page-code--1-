import pytest

from alantra_backend.fixtures import load_sandbox_snapshot
from alantra_backend.transformations.cash_intelligence import (
    build_cash_intelligence_payload,
    cash_stats_table,
    efficiency_stats_table,
    growth_stats_table,
    main_stats,
    spend_stats,
)
from alantra_backend.transformations.core import aggregate_all_transactions


@pytest.fixture
def sandbox():
    return load_sandbox_snapshot()


def test_main_stats(sandbox):
    stats = main_stats(sandbox.snapshots, as_of=sandbox.anchor)
    assert stats.runway_months > 0
    assert stats.avg_net_burn_3mo >= 0
    # Sensitivity = non-negative.
    assert stats.runway_sensitivity_months >= 0


def test_cash_stats_table_keys(sandbox):
    table = cash_stats_table(sandbox.snapshots, as_of=sandbox.anchor)
    expected = {
        "total_cash_balance",
        "cash_balance_mom_pct",
        "net_cash_flow",
        "net_cash_flow_mom_pct",
        "avg_3mo_net_cash_flow",
        "total_inflow",
        "inflow_mom_pct",
        "total_outflow",
        "outflow_mom_pct",
        "operating_margin_pct",
        "operating_margin_mom_pct",
        "projected_runway_months",
        "gross_margin_pct",
        "gross_margin_mom_pct",
    }
    assert set(table.keys()) == expected


def test_growth_stats_table_keys(sandbox):
    table = growth_stats_table(sandbox.snapshots, as_of=sandbox.anchor)
    expected = {
        "arr", "arr_mom_pct", "mrr", "mrr_mom_pct",
        "nrr_pct", "nrr_mom_pct", "grr_pct", "grr_mom_pct",
        "logo_churn_pct", "logo_churn_mom_pct",
        "arpu", "arpu_mom_pct",
    }
    assert set(table.keys()) == expected


def test_efficiency_stats_table_keys(sandbox):
    table = efficiency_stats_table(sandbox.snapshots, as_of=sandbox.anchor)
    expected = {
        "cac", "cac_mom_pct",
        "ltv", "ltv_mom_pct",
        "ltv_to_cac", "ltv_to_cac_mom_pct",
        "cac_payback_months", "cac_payback_months_mom_pct",
        "rule_of_40", "rule_of_40_mom_pct",
        "burn_multiple", "burn_multiple_mom_pct",
        "magic_number", "magic_number_mom_pct",
    }
    assert set(table.keys()) == expected


def test_spend_stats_buckets(sandbox):
    transactions = aggregate_all_transactions(sandbox.snapshots)
    stats = spend_stats(transactions, as_of=sandbox.anchor)
    assert set(stats.category_percentages.keys()) == {
        "all", "international", "check", "ach", "reimbursements", "cards"
    }
    # "all" must always be 100 when there's any spend.
    assert stats.category_percentages["all"] in {0.0, 100.0}


def test_full_payload_shape(sandbox):
    payload = build_cash_intelligence_payload(sandbox.snapshots, as_of=sandbox.anchor)
    assert set(payload.keys()) == {
        "as_of", "horizon_days", "distance",
        "main_stats", "series",
        "cash_stats", "growth_stats", "efficiency_stats", "spend_stats",
    }
    assert set(payload["series"].keys()) == {"total_cash", "cash_growth", "efficiency_pct", "spend"}
