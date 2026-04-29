"""Shared primitives used by every dashboard transformation.

The interesting helpers are:

* :func:`monthly_net_flow` – groups transactions into calendar months.
* :func:`trailing_burn` – 3-month (configurable) rolling average of outflows
  minus inflows. Returns a *positive* number when the business is burning.
* :func:`runway_months` – ``balance / burn`` with the obvious edge cases
  (infinite runway when burn <= 0, zero runway when balance <= 0).
* :func:`reconstruct_balance_history` – given the current balance plus a
  reverse-chronological transaction stream, back-solve daily balances.
* :func:`project_forward_balance` – extrapolate daily balances *forward* using
  trailing burn, used by the Cash Calendar.

Keeping them here (rather than duplicating inside each section) makes the
MoM / runway semantics easy to reason about and test.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Dict, Iterable, List, Optional, Tuple

from dateutil.relativedelta import relativedelta

from ..models import AccountSnapshot, NormalizedTransaction


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------

def month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def month_floor(d: date) -> date:
    return d.replace(day=1)


def iter_month_starts(start: date, end: date) -> List[date]:
    """Inclusive list of month-start dates between ``start`` and ``end``."""

    cur = month_floor(start)
    out: List[date] = []
    end_floor = month_floor(end)
    while cur <= end_floor:
        out.append(cur)
        cur = (cur + relativedelta(months=1))
    return out


# ---------------------------------------------------------------------------
# Aggregations over normalised transactions (positive = inflow, negative = outflow)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class MonthlyFlow:
    month: str          # YYYY-MM
    inflow: float       # sum of positive amounts
    outflow: float      # positive number representing sum of abs(negative)
    net: float          # inflow - outflow


def monthly_net_flow(transactions: Iterable[NormalizedTransaction]) -> List[MonthlyFlow]:
    by_month: Dict[str, Dict[str, float]] = {}
    for t in transactions:
        if t.pending:
            continue
        bucket = by_month.setdefault(month_key(t.date), {"in": 0.0, "out": 0.0})
        if t.amount >= 0:
            bucket["in"] += t.amount
        else:
            bucket["out"] += -t.amount
    out = []
    for key in sorted(by_month):
        b = by_month[key]
        out.append(MonthlyFlow(month=key, inflow=b["in"], outflow=b["out"], net=b["in"] - b["out"]))
    return out


def trailing_burn(
    transactions: Iterable[NormalizedTransaction],
    *,
    as_of: date,
    months: int = 3,
) -> float:
    """Average *net* burn per month (positive number).

    Uses the ``months`` fully-closed calendar months preceding ``as_of``. A
    negative number means the business was net profitable in that window, in
    which case runway is treated as infinite.
    """

    if months <= 0:
        raise ValueError("months must be >= 1")

    # The window covers ``months`` full months, ending the month before ``as_of``.
    window_end = month_floor(as_of) - timedelta(days=1)
    window_start = (month_floor(as_of) - relativedelta(months=months))

    total_net = 0.0
    n = 0
    for flow in monthly_net_flow(transactions):
        y, m = (int(p) for p in flow.month.split("-"))
        d = date(y, m, 1)
        if window_start <= d <= window_end:
            total_net += flow.net
            n += 1
    if n == 0:
        return 0.0
    avg_net = total_net / n
    return -avg_net  # flip: positive value = burn


def runway_months(balance: float, burn_per_month: float) -> float:
    """Return runway in months.

    * ``burn <= 0`` → infinite (we pick ``9999`` as a graph-friendly sentinel).
    * ``balance <= 0`` → zero.
    """

    if balance <= 0:
        return 0.0
    if burn_per_month <= 0:
        return 9999.0
    return balance / burn_per_month


# ---------------------------------------------------------------------------
# Balance history reconstruction
# ---------------------------------------------------------------------------

def reconstruct_balance_history(
    current_balance: float,
    transactions: Iterable[NormalizedTransaction],
    *,
    as_of: date,
    start: Optional[date] = None,
) -> List[Tuple[date, float]]:
    """Return the list of ``(date, balance_at_end_of_day)`` tuples.

    Given today's balance and the ordered list of transactions that produced
    it, we can walk backwards: ``balance_yesterday = balance_today - today_net``.
    Only non-pending transactions are included (pending = ``Approvals Pending``
    which hasn't hit the balance yet).
    """

    txs = sorted(
        (t for t in transactions if not t.pending),
        key=lambda t: t.date,
    )
    if start is None and txs:
        start = txs[0].date
    elif start is None:
        start = as_of
    start = min(start, as_of)

    # Bucket per-day net flow.
    per_day: Dict[date, float] = {}
    for t in txs:
        if t.date > as_of:
            continue
        per_day[t.date] = per_day.get(t.date, 0.0) + t.amount

    # Walk backwards from ``as_of`` to ``start`` to compute each day's closing.
    closings: List[Tuple[date, float]] = []
    day = as_of
    balance = current_balance
    while day >= start:
        closings.append((day, balance))
        balance -= per_day.get(day, 0.0)
        day -= timedelta(days=1)
    closings.reverse()
    return closings


def project_forward_balance(
    current_balance: float,
    *,
    from_date: date,
    days: int,
    scheduled_events: Iterable[Tuple[date, float]] = (),
    daily_burn: float = 0.0,
) -> List[Tuple[date, float]]:
    """Project daily balances forward ``days`` days.

    * ``daily_burn`` is subtracted every day (it's already a net burn figure,
      positive = cash leaving).
    * ``scheduled_events`` are (date, amount) tuples added on their day; amount
      is signed so inflows are positive.
    """

    events_by_day: Dict[date, float] = {}
    for d, amt in scheduled_events:
        events_by_day[d] = events_by_day.get(d, 0.0) + amt

    out = [(from_date, current_balance)]
    balance = current_balance
    for i in range(1, days + 1):
        d = from_date + timedelta(days=i)
        balance -= daily_burn
        balance += events_by_day.get(d, 0.0)
        out.append((d, balance))
    return out


# ---------------------------------------------------------------------------
# Month-over-month deltas
# ---------------------------------------------------------------------------

def mom_delta(current: float, prior: float) -> Optional[float]:
    """Month-over-month percentage change.

    Returns ``None`` when the prior period is zero *and* the current is zero;
    returns ``float('inf')`` with the sign of ``current`` when prior is zero
    but current isn't (the frontend displays that as ``∞``).
    """

    if prior == 0:
        if current == 0:
            return 0.0
        return float("inf") if current > 0 else float("-inf")
    return (current - prior) / abs(prior)


# ---------------------------------------------------------------------------
# Aggregation across accounts
# ---------------------------------------------------------------------------

def aggregate_all_transactions(snapshots: Iterable[AccountSnapshot]) -> List[NormalizedTransaction]:
    """Flatten every snapshot into one transaction list, sorted by date."""

    rows: List[NormalizedTransaction] = []
    for s in snapshots:
        rows.extend(s.transactions)
    rows.sort(key=lambda t: t.date)
    return rows


def total_balance(snapshots: Iterable[AccountSnapshot]) -> float:
    return sum(s.account.balance for s in snapshots)
