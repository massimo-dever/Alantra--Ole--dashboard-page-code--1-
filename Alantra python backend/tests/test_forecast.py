import pytest

from alantra_backend.fixtures import load_sandbox_snapshot
from alantra_backend.transformations.forecast import build_forecast_payload


@pytest.fixture
def sandbox():
    return load_sandbox_snapshot()


def test_forecast_payload_contains_three_scenarios(sandbox):
    payload = build_forecast_payload(sandbox.snapshots, as_of=sandbox.anchor)
    assert set(payload.keys()) == {
        "as_of", "horizon_months", "main_stats",
        "trajectories", "reference_lines", "scenarios", "selected_scenario",
    }
    # Spec: dotted horizontal line at 0$ on the cash trajectory graph.
    assert payload["reference_lines"] == {"zero": 0}
    assert set(payload["scenarios"].keys()) == {"Base", "Upside", "Downside"}
    # Every trajectory has horizon_months points.
    for name, series in payload["trajectories"].items():
        assert len(series) == payload["horizon_months"], name


def test_upside_ends_higher_than_base(sandbox):
    payload = build_forecast_payload(sandbox.snapshots, as_of=sandbox.anchor)
    base_end = payload["trajectories"]["Base"][-1]["cash"]
    upside_end = payload["trajectories"]["Upside"][-1]["cash"]
    downside_end = payload["trajectories"]["Downside"][-1]["cash"]
    assert upside_end >= base_end
    assert downside_end <= base_end


def test_scenario_table_structure(sandbox):
    payload = build_forecast_payload(sandbox.snapshots, as_of=sandbox.anchor)
    base = payload["scenarios"]["Base"]
    assert base["scenario"]["name"] == "Base"
    m0 = base["months"][0]
    assert set(m0["revenue"].keys()) == {
        "starting_mrr", "new_mrr", "expansion_mrr_pct", "contraction_mrr_pct",
        "churn_mrr_pct", "ending_mrr", "arr",
    }
    assert set(m0["cogs"].keys()) == {"lines", "total_cogs", "gross_margin_pct"}
    # Required default departments must be present.
    dept_names = [d["name"] for d in m0["headcount"]["departments"]]
    assert dept_names == ["Engineering", "Sales", "Marketing", "Management", "HR"]
    # Per-dept row has every required stat.
    for dept in m0["headcount"]["departments"]:
        assert set(dept.keys()) == {
            "name", "headcount", "planned_hires", "avg_fully_loaded_cost",
            "attrition_pct", "total_hc_cost",
        }
    # P&L row with every required column.
    assert set(m0["pnl"].keys()) == {
        "revenue", "cogs", "gross_margin_pct", "opex", "ebitda", "ending_cash",
    }


def test_main_stats_keys(sandbox):
    payload = build_forecast_payload(sandbox.snapshots, as_of=sandbox.anchor)
    expected = {
        "runway_months", "cash_at_start_of_horizon", "cash_at_end_of_horizon",
        "diff_pct", "avg_monthly_burn_next_3mo_base",
    }
    assert set(payload["main_stats"].keys()) == expected
