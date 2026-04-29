import pytest

from alantra_backend.fixtures import load_sandbox_snapshot
from alantra_backend.transformations.core import aggregate_all_transactions
from alantra_backend.transformations.recurring_outflow import (
    build_recurring_outflow_payload,
    detect_recurring_payments,
    classify_category,
)


@pytest.fixture
def sandbox():
    return load_sandbox_snapshot()


def test_detection_finds_payroll_and_rent_and_saas(sandbox):
    txs = aggregate_all_transactions(sandbox.snapshots)
    payments = detect_recurring_payments(txs, as_of=sandbox.anchor)
    vendors = {p.vendor.lower() for p in payments}
    # Every repeating sandbox vendor must be detected.
    for expected in ["gusto payroll", "wework", "amazon web services", "slack", "datadog"]:
        assert expected in vendors, f"{expected} not detected: {vendors}"


def test_every_payment_has_known_cadence(sandbox):
    txs = aggregate_all_transactions(sandbox.snapshots)
    payments = detect_recurring_payments(txs, as_of=sandbox.anchor)
    for p in payments:
        assert p.cadence in {"Weekly", "Monthly", "Annually"}
        assert p.monthly_equivalent > 0


def test_category_bucketing():
    from alantra_backend.models import NormalizedTransaction
    from datetime import date

    def _make(vendor, category="Other", subcat=""):
        return NormalizedTransaction(
            id="x", account_id="a", date=date(2025, 1, 1), amount=-100,
            vendor=vendor, category=category, subcategory=subcat,
        )

    assert classify_category(_make("Gusto Payroll")) == "Payroll"
    assert classify_category(_make("Amazon Web Services")) == "Infrastructure"
    assert classify_category(_make("Slack")) == "SaaS"
    assert classify_category(_make("WeWork")) == "Office"
    assert classify_category(_make("Google Ads")) == "Marketing"
    assert classify_category(_make("Random Cafe")) == "Other"


def test_payload_shape_and_series_categories(sandbox):
    txs = aggregate_all_transactions(sandbox.snapshots)
    payload = build_recurring_outflow_payload(txs, as_of=sandbox.anchor)
    assert set(payload.keys()) == {
        "as_of", "main_stats", "series_by_category",
        "category_breakdown_pct", "payments",
    }
    # Required line-graph categories per spec.
    for c in ["all", "Infrastructure", "Marketing", "SaaS", "Office", "Payroll"]:
        assert c in payload["series_by_category"]

    stats = payload["main_stats"]
    assert stats["monthly_recurring_out"] > 0
    assert stats["locked_in_12mo"] > 0
    assert stats["locked_in_vendor_count"] > 0


def test_payment_table_rows_have_required_columns(sandbox):
    txs = aggregate_all_transactions(sandbox.snapshots)
    payload = build_recurring_outflow_payload(txs, as_of=sandbox.anchor)
    required_cols = {
        "vendor", "category", "cadence", "last_charge",
        "last_charge_date", "next_due_in_days", "status", "monthly_equivalent",
    }
    for row in payload["payments"]:
        assert required_cols <= set(row.keys())
        assert row["status"] in {"Paid", "Overdue", "Cancelled"}
