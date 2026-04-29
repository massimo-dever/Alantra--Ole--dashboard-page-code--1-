"""Tests for the per-request DashboardContext.

The whole point of the context is that each shared transformation runs at
most *once* per request, even when several sections of the same page need its
output. These tests pin that invariant by counting how many times each
underlying primitive gets called when we build a full payload.
"""

from __future__ import annotations

from datetime import date

import pytest

from alantra_backend.fixtures import load_sandbox_snapshot
from alantra_backend.transformations import (
    cash_calendar,
    cash_intelligence,
    command_center,
    forecast,
    recurring_outflow,
    treasury,
)
from alantra_backend.transformations.context import DashboardContext


@pytest.fixture
def sandbox():
    return load_sandbox_snapshot()


def test_context_caches_transactions(sandbox):
    ctx = DashboardContext(sandbox.snapshots, as_of=sandbox.anchor)
    first = ctx.transactions
    second = ctx.transactions
    # cached_property returns the *exact* same object on subsequent reads.
    assert first is second


def test_context_caches_recurring(sandbox):
    ctx = DashboardContext(sandbox.snapshots, as_of=sandbox.anchor)
    first = ctx.recurring_payments
    second = ctx.recurring_payments
    assert first is second


def test_context_caches_command_center_stats(sandbox):
    ctx = DashboardContext(sandbox.snapshots, as_of=sandbox.anchor)
    first = ctx.command_center_stats
    second = ctx.command_center_stats
    assert first is second


def test_recurring_detection_runs_once_per_request(monkeypatch, sandbox):
    """Spec: each transformation should only need to run once even when
    multiple webpages share it. We assert this by counting calls into
    ``detect_recurring_payments`` while building the Cash Calendar payload,
    which itself depends on recurring detection."""

    from alantra_backend.transformations import recurring_outflow as ro

    calls = {"n": 0}
    real = ro.detect_recurring_payments

    def _spy(*args, **kwargs):
        calls["n"] += 1
        return real(*args, **kwargs)

    monkeypatch.setattr(ro, "detect_recurring_payments", _spy)
    # cash_calendar imported the helper indirectly via the context, so the
    # context's ``recurring_payments`` cached_property is what we want to spy
    # on. The patch above replaces the function in the recurring_outflow
    # module namespace; the context uses ``from .recurring_outflow import``
    # *inside* the property body so it resolves through the patched name.

    ctx = DashboardContext(sandbox.snapshots, as_of=sandbox.anchor)
    cash_calendar.build_cash_calendar_payload(ctx)
    cash_calendar.build_cash_calendar_payload(ctx)  # second page hit
    command_center.build_command_center_payload(ctx)

    assert calls["n"] == 1, (
        "detect_recurring_payments should run exactly once per request, "
        f"observed {calls['n']} calls"
    )


def test_per_account_runway_runs_once_per_request(monkeypatch, sandbox):
    from alantra_backend.transformations import command_center as cc

    calls = {"n": 0}
    real = cc.per_account_runway

    def _spy(*args, **kwargs):
        calls["n"] += 1
        return real(*args, **kwargs)

    monkeypatch.setattr(cc, "per_account_runway", _spy)

    ctx = DashboardContext(sandbox.snapshots, as_of=sandbox.anchor)
    # Treasury + Command Center both rely on per-account runway.
    treasury.build_treasury_payload(ctx)
    command_center.build_command_center_payload(ctx)

    assert calls["n"] == 1


def test_command_center_stats_runs_once_for_cash_intelligence(monkeypatch, sandbox):
    """Cash Intelligence needs the command-center KPI block in three places
    (main stats + efficiency-table current + efficiency-table prior-month).

    We allow up to *two* total calls per request: the current as-of block and
    the prior-month block. Without the context cache the previous code
    re-derived the current block twice, so this test pins that improvement.
    """

    from alantra_backend.transformations import command_center as cc

    calls = {"n": 0}
    real = cc.command_center_stats

    def _spy(*args, **kwargs):
        calls["n"] += 1
        return real(*args, **kwargs)

    monkeypatch.setattr(cc, "command_center_stats", _spy)

    ctx = DashboardContext(sandbox.snapshots, as_of=sandbox.anchor)
    cash_intelligence.build_cash_intelligence_payload(ctx)

    # The context exposes ``command_center_stats`` (current as-of) and
    # ``prior_month_command_center_stats`` (one month back). Two distinct
    # as-ofs ⇒ two real computations.
    assert calls["n"] <= 2, (
        f"command_center_stats called {calls['n']} times; expected at most 2 "
        "(current + prior-month)."
    )


def test_full_dashboard_one_call_chain(monkeypatch, sandbox):
    """Smoke: build every webpage payload from a single shared context and
    confirm each shared primitive ran a small bounded number of times."""

    from alantra_backend.transformations import command_center as cc
    from alantra_backend.transformations import recurring_outflow as ro
    from alantra_backend.transformations.core import aggregate_all_transactions
    from alantra_backend.transformations import core as core_mod

    cc_calls = {"n": 0}
    ro_calls = {"n": 0}
    agg_calls = {"n": 0}
    real_cc = cc.command_center_stats
    real_ro = ro.detect_recurring_payments
    real_agg = core_mod.aggregate_all_transactions

    def _spy(counter, fn):
        def _wrapped(*a, **kw):
            counter["n"] += 1
            return fn(*a, **kw)
        return _wrapped

    monkeypatch.setattr(cc, "command_center_stats", _spy(cc_calls, real_cc))
    monkeypatch.setattr(ro, "detect_recurring_payments", _spy(ro_calls, real_ro))
    monkeypatch.setattr(core_mod, "aggregate_all_transactions", _spy(agg_calls, real_agg))

    ctx = DashboardContext(sandbox.snapshots, as_of=sandbox.anchor)
    command_center.build_command_center_payload(ctx)
    treasury.build_treasury_payload(ctx)
    cash_calendar.build_cash_calendar_payload(ctx)
    cash_intelligence.build_cash_intelligence_payload(ctx)
    forecast.build_forecast_payload(ctx)
    recurring_outflow.build_recurring_outflow_payload(ctx)

    # Aggregation runs zero or one extra time depending on whether the
    # context's cached_property has been touched before our spy was patched.
    # Either way it must be vastly less than once-per-page (6).
    assert agg_calls["n"] <= 1, agg_calls["n"]
    # command_center_stats: current + prior month (used by cash_intelligence).
    assert cc_calls["n"] <= 2, cc_calls["n"]
    # recurring detection runs:
    #   * once for the request's as-of (cached, reused by Command Center,
    #     Cash Calendar and Recurring Outflow);
    #   * once inside the prior-month sub-context Cash Intelligence builds
    #     for MoM deltas;
    #   * three times for the Recurring Outflow page's "vs prior 3-mo
    #     average" baseline (one per month, intentional historical replay).
    # Total cap = 5; without the context cache it would be 1-per-page on the
    # 6-page dashboard plus the historical replays.
    assert ro_calls["n"] <= 5, ro_calls["n"]
