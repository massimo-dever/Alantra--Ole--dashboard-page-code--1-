"""FastAPI surface.

One endpoint per dashboard webpage. Each builds a single
:class:`DashboardContext` so the shared transformations (transaction
aggregation, recurring-payment detection, command-center KPI block, etc.) run
exactly once per request – even when several sections of the same page rely on
the same primitive.

Endpoints (one per spec'd webpage):

* ``GET /command-center`` – Command Center page.
* ``GET /treasury`` – Metrics & Monitoring → Treasury page.
* ``GET /cash-calendar`` – Metrics & Monitoring → Cash Calendar page.
* ``GET /cash-intelligence`` – Metrics & Monitoring → Cash Intelligence page.
* ``GET /forecast`` – Budgets & Forecasts → Forecast & Scenarios page.
* ``GET /recurring-outflow`` – Budgets & Forecasts → Recurring Outflow page.

Startup::

    uvicorn alantra_backend.app:app --reload

Environment:

* ``SUPABASE_URL`` / ``SUPABASE_KEY`` – when present we pull real data.
* Otherwise we fall back to the Plaid sandbox fixture so the endpoints stay
  inspectable without credentials.
"""

from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import FastAPI, Query

from .config import load_settings
from .fixtures import load_sandbox_snapshot
from .importer import load_snapshots_from_supabase
from .supabase_client import LiveSupabaseReader
from .transformations import (
    cash_calendar,
    cash_intelligence,
    command_center,
    forecast,
    recurring_outflow,
    treasury,
)
from .transformations.context import DashboardContext


app = FastAPI(title="Alantra Python Backend")


def _load_snapshots(user_id: Optional[str] = None):
    settings = load_settings()
    if settings.has_supabase:
        try:
            reader = LiveSupabaseReader(settings.supabase_url, settings.supabase_key)
            snaps = load_snapshots_from_supabase(reader, user_id=user_id)
            if snaps and any(s.transactions for s in snaps):
                return snaps
        except Exception:
            # Fall back to fixture on any Supabase error — RLS, missing secrets, etc.
            pass
    return load_sandbox_snapshot().snapshots


def _parse_as_of(as_of: Optional[str]) -> date:
    if as_of:
        return date.fromisoformat(as_of)
    snaps = load_sandbox_snapshot()
    return snaps.anchor


def _build_context(user_id: Optional[str], as_of: Optional[str]) -> DashboardContext:
    """Single entry point used by every endpoint so caching is consistent."""

    snapshots = _load_snapshots(user_id)
    return DashboardContext(snapshots, as_of=_parse_as_of(as_of))


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/healthz")
def healthz():
    return {"ok": True}


# ---------------------------------------------------------------------------
# Webpage endpoints – one per underlined section in the spec.
# ---------------------------------------------------------------------------

@app.get("/command-center")
def command_center_endpoint(
    user_id: Optional[str] = None,
    as_of: Optional[str] = None,
    account_id: Optional[str] = None,
    window: str = Query("3m", pattern="^(1m|3m|ytd|all)$"),
):
    """Command Center webpage:

    * Per-account runway block.
    * Runway-over-time graph (default = lowest runway account, filterable by
      account and ``1m``/``3m``/``ytd``/``all`` window).
    * The 8-stat KPI row (NRR, Rule of 40, Burn Multiple, Magic Number,
      Gross Margin, Recurring Out $/mo, Tightest Day $, Approvals Pending $).
    """

    ctx = _build_context(user_id, as_of)
    return command_center.build_command_center_payload(
        ctx,
        runway_account_id=account_id,
        runway_window=window,  # type: ignore[arg-type]
    )


@app.get("/treasury")
def treasury_endpoint(
    user_id: Optional[str] = None,
    as_of: Optional[str] = None,
    months_back: int = Query(6, ge=1, le=36),
):
    """Metrics & Monitoring → Treasury webpage:

    * Aggregated stats across every entity + per-account stats.
    * Total-cash-over-time graph (last ``months_back`` months).
    * Outlier / APY / target-shortfall alert system.
    """

    ctx = _build_context(user_id, as_of)
    return treasury.build_treasury_payload(ctx, months_back=months_back)


@app.get("/cash-calendar")
def cash_calendar_endpoint(
    user_id: Optional[str] = None,
    as_of: Optional[str] = None,
    horizon_days: int = Query(90),
    distance: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
):
    """Metrics & Monitoring → Cash Calendar webpage:

    * Tightest-point / 30-day-net / scheduled-flow main stats.
    * Forward-looking calendar graph with ``daily``/``weekly``/``monthly``
      point distance and ``30``/``90``/``180``/``365`` day horizons.
    """

    if horizon_days not in (30, 90, 180, 365):
        # The spec only exposes these horizons; rejecting other values keeps
        # the UI/Backend pair in lockstep.
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="horizon_days must be one of 30, 90, 180 or 365",
        )

    ctx = _build_context(user_id, as_of)
    return cash_calendar.build_cash_calendar_payload(
        ctx,
        horizon_days=horizon_days,   # type: ignore[arg-type]
        distance=distance,           # type: ignore[arg-type]
    )


@app.get("/cash-intelligence")
def cash_intelligence_endpoint(
    user_id: Optional[str] = None,
    as_of: Optional[str] = None,
    horizon_days: int = Query(90),
    distance: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
):
    """Metrics & Monitoring → Cash Intelligence webpage:

    * Main stats (runway + sensitivity, gap to break-even, burn,
      Burn Multiple, NRR, Rule of 40).
    * Four historical line charts (total cash, cash growth/shrinkage,
      efficiency, spend) sharing the same horizon / point-distance filters.
    * Cash / Growth / Efficiency / Spend stat tables.
    """

    if horizon_days not in (30, 90, 180, 365):
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="horizon_days must be one of 30, 90, 180 or 365",
        )

    ctx = _build_context(user_id, as_of)
    return cash_intelligence.build_cash_intelligence_payload(
        ctx,
        horizon_days=horizon_days,    # type: ignore[arg-type]
        distance=distance,            # type: ignore[arg-type]
    )


@app.get("/forecast")
def forecast_endpoint(
    user_id: Optional[str] = None,
    as_of: Optional[str] = None,
    horizon_months: int = Query(12, ge=1, le=36),
    selected_scenario: str = Query("Base"),
):
    """Budgets & Forecasts → Forecast & Scenarios webpage:

    * Main stats table (runway, cash at start/end of horizon, diff %,
      avg base-scenario burn over the next 3 months).
    * Cash trajectory graph for Base/Upside/Downside (and any future custom
      scenarios) with the dotted ``zero`` reference line.
    * Large editable scenario-planning table (Revenue / COGS / Headcount).
    * Computed P&L table for the selected scenario.
    """

    ctx = _build_context(user_id, as_of)
    return forecast.build_forecast_payload(
        ctx,
        horizon_months=horizon_months,
        selected_scenario=selected_scenario,
    )


@app.get("/recurring-outflow")
def recurring_outflow_endpoint(
    user_id: Optional[str] = None,
    as_of: Optional[str] = None,
):
    """Budgets & Forecasts → Recurring Outflow webpage:

    * Main stats (monthly recurring out, prior-3mo delta, locked-in 12mo,
      vendor count, flagged-for-review block).
    * Line graph by category (all / Infrastructure / Marketing / SaaS /
      Office / Payroll).
    * Horizontal bar chart with category percentages.
    * Full table of detected recurring payments.
    """

    ctx = _build_context(user_id, as_of)
    return recurring_outflow.build_recurring_outflow_payload(ctx)
