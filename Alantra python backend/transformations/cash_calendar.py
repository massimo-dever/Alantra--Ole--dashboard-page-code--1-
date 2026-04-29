"""Cash Calendar transformations.

The calendar is the forward-looking view: take today's cash, subtract daily
burn, and overlay scheduled inflows / outflows to spot the tightest upcoming
moment. Scheduled events are derived from two sources:

1. **Detected recurring payments** (from :mod:`recurring_outflow`). We project
   the next ``horizon_days`` worth of charges forward in time.
2. **Pending Plaid transactions** (``pending=true``). They have a known amount
   and an effective date, so we place them on the exact day.

The "3-month burn floor" in the stats row is the cash level that would leave
exactly 3 months of runway left at the current burn rate.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, timedelta
from typing import Dict, Iterable, List, Literal, Optional, Tuple

from dateutil.relativedelta import relativedelta

from ..models import AccountSnapshot, NormalizedTransaction, RecurringPayment
from .context import DashboardContext, ensure_context
from .core import (
    aggregate_all_transactions,
    project_forward_balance,
    total_balance,
    trailing_burn,
)


PointDistance = Literal["daily", "weekly", "monthly"]
Horizon = Literal[30, 90, 180, 365]


# ---------------------------------------------------------------------------
# Scheduled events
# ---------------------------------------------------------------------------

def _projected_recurring_events(
    recurring: List[RecurringPayment],
    *,
    as_of: date,
    horizon_days: int,
) -> List[Tuple[date, float, str]]:
    """Project recurring payments forward.

    Returns ``(date, signed_amount, vendor)`` tuples. Amounts are negative for
    outflows because that's the convention callers pass to
    ``project_forward_balance``.
    """

    out: List[Tuple[date, float, str]] = []
    end = as_of + timedelta(days=horizon_days)
    for r in recurring:
        if r.status == "Cancelled":
            continue
        next_day = r.last_charge_date
        while next_day <= end:
            if r.cadence == "Weekly":
                next_day = next_day + timedelta(days=7)
            elif r.cadence == "Annually":
                next_day = next_day + timedelta(days=365)
            else:
                next_day = next_day + relativedelta(months=1)
            if next_day > as_of and next_day <= end:
                out.append((next_day, -r.last_charge, r.vendor))
    return out


def _pending_events(transactions: Iterable[NormalizedTransaction]) -> List[Tuple[date, float, str]]:
    return [
        (t.date, t.amount, t.vendor or "pending")
        for t in transactions
        if t.pending
    ]


# ---------------------------------------------------------------------------
# Main-stats + graph data
# ---------------------------------------------------------------------------

@dataclass
class CashCalendarStats:
    tightest_point_amount: float
    tightest_point_date: str
    tightest_point_days_out: int
    three_month_burn_floor: float
    tightest_vs_burn_floor: str          # "above" | "below"
    net_30_day: float
    scheduled_inflow_30d: float
    scheduled_outflow_30d: float

    def to_dict(self) -> Dict:
        return asdict(self)


def _downsample(series: List[Tuple[date, float]], distance: PointDistance) -> List[Tuple[date, float]]:
    if distance == "daily":
        return series
    if distance == "weekly":
        return [pt for i, pt in enumerate(series) if i % 7 == 0 or i == len(series) - 1]
    # monthly: keep the first day of every month (plus the very last point).
    out = []
    seen_months = set()
    for d, v in series:
        key = (d.year, d.month)
        if key not in seen_months:
            out.append((d, v))
            seen_months.add(key)
    if series and series[-1][0] != out[-1][0]:
        out.append(series[-1])
    return out


def build_cash_calendar_payload(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
    horizon_days: Horizon = 90,
    distance: PointDistance = "daily",
) -> Dict:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    snapshots = ctx.snapshots
    as_of = ctx.as_of
    transactions = ctx.transactions

    burn_per_month = trailing_burn(transactions, as_of=as_of)
    daily_burn = burn_per_month / 30.4375  # avg days per month

    recurring_events = _projected_recurring_events(
        ctx.recurring_payments, as_of=as_of, horizon_days=horizon_days
    )
    pending_events = _pending_events(transactions)

    # We combine the two streams; pending transactions already carry their
    # exact amount and replace the trailing-burn approximation for that day.
    # To avoid double-counting recurring payments against the ``daily_burn``
    # average, we instead build the forward path by applying *only* the
    # recurring / pending events and assume the remainder of the burn happens
    # smoothly per day. Because recurring payments are already *part* of the
    # trailing burn, we subtract their monthly-equivalent from ``daily_burn``.
    recurring_monthly = sum(-amt for (_, amt, _) in recurring_events) / max(
        horizon_days / 30.4375, 1
    )
    adjusted_daily_burn = max((burn_per_month - recurring_monthly) / 30.4375, 0.0)

    scheduled_events = [(d, a) for (d, a, _) in recurring_events] + [(d, a) for (d, a, _) in pending_events]

    total_cash = total_balance(snapshots)
    series = project_forward_balance(
        total_cash,
        from_date=as_of,
        days=horizon_days,
        scheduled_events=scheduled_events,
        daily_burn=adjusted_daily_burn,
    )

    # Stats.
    tight_d, tight_v = min(series, key=lambda pt: pt[1])
    three_month_floor = burn_per_month * 3
    net_30d = series[min(30, len(series) - 1)][1] - series[0][1]
    scheduled_inflow_30d = sum(
        a for (d, a) in scheduled_events
        if as_of < d <= as_of + timedelta(days=30) and a > 0
    )
    scheduled_outflow_30d = sum(
        -a for (d, a) in scheduled_events
        if as_of < d <= as_of + timedelta(days=30) and a < 0
    )

    stats = CashCalendarStats(
        tightest_point_amount=round(tight_v, 2),
        tightest_point_date=tight_d.isoformat(),
        tightest_point_days_out=(tight_d - as_of).days,
        three_month_burn_floor=round(three_month_floor, 2),
        tightest_vs_burn_floor="above" if tight_v >= three_month_floor else "below",
        net_30_day=round(net_30d, 2),
        scheduled_inflow_30d=round(scheduled_inflow_30d, 2),
        scheduled_outflow_30d=round(scheduled_outflow_30d, 2),
    )

    downsampled = _downsample(series, distance)

    return {
        "as_of": as_of.isoformat(),
        "horizon_days": horizon_days,
        "distance": distance,
        "main_stats": stats.to_dict(),
        "series": [
            {"date": d.isoformat(), "balance": round(v, 2)} for d, v in downsampled
        ],
        "reference_lines": {
            "three_month_burn_floor": round(three_month_floor, 2),
            "zero": 0,
        },
        "scheduled_events": [
            {"date": d.isoformat(), "amount": round(a, 2), "vendor": v}
            for (d, a, v) in recurring_events + pending_events
            if as_of < d <= as_of + timedelta(days=horizon_days)
        ],
    }
