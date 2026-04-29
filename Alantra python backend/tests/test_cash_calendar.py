import pytest

from alantra_backend.fixtures import load_sandbox_snapshot
from alantra_backend.transformations.cash_calendar import build_cash_calendar_payload


@pytest.fixture
def sandbox():
    return load_sandbox_snapshot()


def test_cash_calendar_payload_shape(sandbox):
    payload = build_cash_calendar_payload(sandbox.snapshots, as_of=sandbox.anchor)
    assert set(payload.keys()) == {
        "as_of",
        "horizon_days",
        "distance",
        "main_stats",
        "series",
        "reference_lines",
        "scheduled_events",
    }
    stats = payload["main_stats"]
    assert set(stats.keys()) == {
        "tightest_point_amount",
        "tightest_point_date",
        "tightest_point_days_out",
        "three_month_burn_floor",
        "tightest_vs_burn_floor",
        "net_30_day",
        "scheduled_inflow_30d",
        "scheduled_outflow_30d",
    }
    assert stats["tightest_point_days_out"] >= 0
    assert stats["tightest_vs_burn_floor"] in {"above", "below"}


@pytest.mark.parametrize("horizon", [30, 90, 180, 365])
@pytest.mark.parametrize("distance", ["daily", "weekly", "monthly"])
def test_horizon_and_distance_variants(sandbox, horizon, distance):
    payload = build_cash_calendar_payload(
        sandbox.snapshots, as_of=sandbox.anchor, horizon_days=horizon, distance=distance
    )
    assert payload["series"], f"empty series for {horizon} / {distance}"
    assert payload["horizon_days"] == horizon
    assert payload["distance"] == distance
    # Daily should produce the most points, monthly the fewest.
    if distance == "daily":
        assert len(payload["series"]) >= horizon / 2


def test_reference_lines_present(sandbox):
    payload = build_cash_calendar_payload(sandbox.snapshots, as_of=sandbox.anchor)
    assert payload["reference_lines"]["zero"] == 0
    assert payload["reference_lines"]["three_month_burn_floor"] >= 0
