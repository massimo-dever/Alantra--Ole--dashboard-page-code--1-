"""Command Center transformations.

Mirrors the spec:

* ``accounts``: per-account balance, 3-mo net flow and runway (the
  "Alantra UK has X balance and Y expenditure/gain in the last months,
  resulting in a runway of Z months" block).
* ``runway_series``: runway-over-time graph with presets ``1m`` / ``3m`` /
  ``ytd`` / ``all``. The default series is the account with the *lowest*
  current runway; callers can override via ``account_id``.
* ``stats``: NRR, Rule of 40, Burn Multiple, Magic Number, Gross Margin,
  Recurring Out ($/mo), Tightest Day ($), Approvals Pending ($).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, timedelta
from typing import Dict, Iterable, List, Literal, Optional, Tuple

from dateutil.relativedelta import relativedelta

from ..models import AccountSnapshot, NormalizedTransaction
from .context import DashboardContext, ensure_context
from .core import (
    aggregate_all_transactions,
    monthly_net_flow,
    reconstruct_balance_history,
    runway_months,
    trailing_burn,
    total_balance,
)


WindowPreset = Literal["1m", "3m", "ytd", "all"]


# ---------------------------------------------------------------------------
# Per-account runway block
# ---------------------------------------------------------------------------

@dataclass
class AccountRunway:
    account_id: str
    entity: str
    name: str
    balance: float
    inflow_3mo: float
    outflow_3mo: float
    net_3mo: float          # positive = gain over the last 3 months
    burn_per_month: float   # positive = burning
    runway_months: float

    def to_dict(self) -> Dict:
        return asdict(self)


def per_account_runway(snapshots: Iterable[AccountSnapshot], *, as_of: date) -> List[AccountRunway]:
    out: List[AccountRunway] = []
    for s in snapshots:
        inflow = outflow = 0.0
        window_start = as_of - relativedelta(months=3)
        for t in s.transactions:
            if t.pending or t.date <= window_start or t.date > as_of:
                continue
            if t.amount >= 0:
                inflow += t.amount
            else:
                outflow += -t.amount
        net_3mo = inflow - outflow
        burn = trailing_burn(s.transactions, as_of=as_of, months=3)
        out.append(
            AccountRunway(
                account_id=s.account.id,
                entity=s.account.entity,
                name=s.account.name,
                balance=s.account.balance,
                inflow_3mo=inflow,
                outflow_3mo=outflow,
                net_3mo=net_3mo,
                burn_per_month=burn,
                runway_months=runway_months(s.account.balance, burn),
            )
        )
    return out


# ---------------------------------------------------------------------------
# Runway time series
# ---------------------------------------------------------------------------

def _window_start(preset: WindowPreset, as_of: date, earliest: date) -> date:
    if preset == "1m":
        return as_of - timedelta(days=30)
    if preset == "3m":
        return as_of - timedelta(days=90)
    if preset == "ytd":
        return date(as_of.year, 1, 1)
    if preset == "all":
        return earliest
    raise ValueError(f"Unknown preset: {preset}")


def runway_series(
    snapshots: List[AccountSnapshot],
    *,
    as_of: date,
    account_id: Optional[str] = None,
    window: WindowPreset = "3m",
    per_acct: Optional[List[AccountRunway]] = None,
) -> Dict:
    """Runway-over-time series for the UI graph.

    If ``account_id`` is provided we build it for just that account; otherwise
    we default to the account with the *lowest* current runway. ``per_acct``
    can be supplied by callers that have already computed the per-account
    runway block (e.g. via the ``DashboardContext`` cache) so we don't redo
    the work.
    """

    if not snapshots:
        return {"account_id": None, "window": window, "series": []}

    if per_acct is None:
        per_acct = per_account_runway(snapshots, as_of=as_of)
    if account_id is None:
        # Default: the tightest (lowest) runway account.
        target = min(per_acct, key=lambda r: r.runway_months)
        account_id = target.account_id

    target_snapshot = next((s for s in snapshots if s.account.id == account_id), None)
    if target_snapshot is None:
        return {"account_id": account_id, "window": window, "series": []}

    earliest = min(
        (t.date for t in target_snapshot.transactions),
        default=as_of - timedelta(days=30),
    )
    start = _window_start(window, as_of, earliest)

    history = reconstruct_balance_history(
        target_snapshot.account.balance,
        target_snapshot.transactions,
        as_of=as_of,
        start=start,
    )

    series = []
    for d, balance in history:
        burn = trailing_burn(target_snapshot.transactions, as_of=d, months=3)
        series.append(
            {
                "date": d.isoformat(),
                "balance": round(balance, 2),
                "burn_per_month": round(burn, 2),
                "runway_months": round(runway_months(balance, burn), 2),
            }
        )

    return {
        "account_id": account_id,
        "account_name": target_snapshot.account.name,
        "window": window,
        "series": series,
    }


# ---------------------------------------------------------------------------
# Command-center KPI stats
# ---------------------------------------------------------------------------

@dataclass
class CommandCenterStats:
    nrr_pct: Optional[float]
    rule_of_40: Optional[int]
    burn_multiple: Optional[float]
    magic_number: Optional[float]
    gross_margin_pct: Optional[float]
    recurring_out_per_month: float
    tightest_day_amount: float
    tightest_day_date: Optional[str]
    approvals_pending_amount: float

    def to_dict(self) -> Dict:
        return asdict(self)


def _safe_div(a: float, b: float) -> Optional[float]:
    if b == 0:
        return None
    return a / b


def _is_revenue_like(t: NormalizedTransaction) -> bool:
    """Heuristic: Stripe payouts and explicit revenue transfers count as MRR.

    The Plaid sandbox fires payroll-style inflows labelled ``INCOME_WAGES``,
    intercompany transfers labelled ``INCOME_OTHER_INCOME`` and Stripe payouts
    via ``Stripe Payout``. For ARR/MRR we treat "revenue-ish" as positive
    inflows that aren't refunds or balance transfers between our own accounts.
    We keep all three buckets – the magnitudes matter, not the labels.
    """

    if t.amount <= 0:
        return False
    if (t.vendor or "").lower().startswith("intercompany"):
        return True
    if (t.vendor or "").lower().startswith("stripe"):
        return True
    if (t.subcategory or "").startswith("INCOME"):
        return True
    return False


def _marketing_sales_spend(transactions: Iterable[NormalizedTransaction]) -> float:
    total = 0.0
    for t in transactions:
        if t.amount >= 0:
            continue
        cat = (t.category or "").lower()
        sub = (t.subcategory or "").lower()
        vendor = (t.vendor or "").lower()
        if "marketing" in cat or "advertising" in cat:
            total += -t.amount
        elif "sales" in vendor or "hubspot" in vendor or "salesforce" in vendor:
            total += -t.amount
        elif "google ads" in vendor or "linkedin ads" in vendor or "facebook ads" in vendor:
            total += -t.amount
    return total


def _revenue_for_window(
    transactions: Iterable[NormalizedTransaction],
    *,
    start: date,
    end: date,
) -> float:
    return sum(t.amount for t in transactions if start < t.date <= end and _is_revenue_like(t))


def _net_burn_for_window(
    transactions: Iterable[NormalizedTransaction],
    *,
    start: date,
    end: date,
) -> float:
    """Positive number – net cash consumed during the window."""

    net = sum(t.amount for t in transactions if not t.pending and start < t.date <= end)
    return -net


def _gross_profit_proxy(transactions: Iterable[NormalizedTransaction], *, start: date, end: date) -> float:
    """Approximate gross profit = revenue - COGS.

    We treat hosting / infra / payment-processor / third-party-API spend as
    COGS; anything else is OpEx. The Plaid sandbox labels AWS / Datadog /
    Stripe fees etc. which gives us enough signal.
    """

    cogs_vendors = {"amazon web services", "datadog", "stripe", "twilio", "openai", "cloudflare"}
    revenue = 0.0
    cogs = 0.0
    for t in transactions:
        if t.date <= start or t.date > end:
            continue
        if _is_revenue_like(t):
            revenue += t.amount
        elif t.amount < 0:
            vendor = (t.vendor or "").lower()
            if any(c in vendor for c in cogs_vendors):
                cogs += -t.amount
    return revenue - cogs


def _approvals_pending(transactions: Iterable[NormalizedTransaction]) -> float:
    """Sum of pending outflow amounts."""

    total = 0.0
    for t in transactions:
        if t.pending and t.amount < 0:
            total += -t.amount
    return total


def _tightest_day(snapshots: List[AccountSnapshot], *, as_of: date, lookback_days: int = 90) -> Tuple[float, Optional[date]]:
    """Find the minimum *daily combined balance* across the last ``lookback_days``.

    We reconstruct each account's balance history and sum them per day, then
    pick the minimum point.
    """

    start = as_of - timedelta(days=lookback_days)
    per_day: Dict[date, float] = {}
    for s in snapshots:
        history = reconstruct_balance_history(
            s.account.balance, s.transactions, as_of=as_of, start=start
        )
        for d, b in history:
            per_day[d] = per_day.get(d, 0.0) + b
    if not per_day:
        return (0.0, None)
    min_day = min(per_day.items(), key=lambda kv: kv[1])
    return (min_day[1], min_day[0])


def command_center_stats(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
    _from_context: bool = False,
) -> CommandCenterStats:
    """Compute the stats row on the Command Center page.

    Accepts either a list of :class:`AccountSnapshot` or a
    :class:`DashboardContext`. When given a context the recurring-payment
    detection and aggregated-transaction computation are reused from the cache.
    """

    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    snapshots = ctx.snapshots
    as_of = ctx.as_of
    transactions = ctx.transactions

    current_month_start = date(as_of.year, as_of.month, 1)
    prior_month_start = current_month_start - relativedelta(months=1)
    year_ago = current_month_start - relativedelta(months=12)

    revenue_this_m = _revenue_for_window(transactions, start=prior_month_start, end=current_month_start)
    revenue_prior_m = _revenue_for_window(
        transactions,
        start=prior_month_start - relativedelta(months=1),
        end=prior_month_start,
    )
    revenue_yoy_old = _revenue_for_window(transactions, start=year_ago - relativedelta(months=1), end=year_ago)

    # NRR: (revenue_this_m from existing cohort) / (revenue_prior_m from same cohort).
    # Without customer-level data we approximate as revenue_this_m / revenue_prior_m.
    nrr = _safe_div(revenue_this_m, revenue_prior_m)
    nrr_pct = round(nrr * 100, 1) if nrr is not None else None

    # Growth rate (MoM annualised) for Rule of 40 / Magic Number.
    growth_mom = _safe_div(revenue_this_m - revenue_prior_m, revenue_prior_m)
    growth_yoy = None
    if revenue_yoy_old:
        growth_yoy = _safe_div(revenue_this_m * 12 - revenue_yoy_old * 12, revenue_yoy_old * 12)

    # Operating margin (gross profit / revenue).
    gp = _gross_profit_proxy(transactions, start=prior_month_start, end=current_month_start)
    gross_margin = _safe_div(gp, revenue_this_m)
    gross_margin_pct = round(gross_margin * 100, 1) if gross_margin is not None else None

    # Burn multiple = net burn / net new ARR. Approximation: net burn over last
    # month / (revenue_this_m - revenue_prior_m). The UI shows a float; we keep
    # the absolute value for readability.
    burn_month = _net_burn_for_window(transactions, start=prior_month_start, end=current_month_start)
    new_arr = (revenue_this_m - revenue_prior_m) * 12
    burn_multiple = _safe_div(burn_month, new_arr) if new_arr > 0 else None
    if burn_multiple is not None:
        burn_multiple = round(abs(burn_multiple), 2)

    # Magic Number = new ARR / S&M spend in the trailing month.
    sm_spend = _marketing_sales_spend(
        t for t in transactions if prior_month_start < t.date <= current_month_start
    )
    magic_number = _safe_div(new_arr, sm_spend * 4) if sm_spend > 0 else None
    if magic_number is not None:
        magic_number = round(magic_number, 2)

    # Rule of 40 = growth rate + operating margin (both %).
    rule_of_40 = None
    if growth_yoy is not None and gross_margin is not None:
        rule_of_40 = round((growth_yoy + gross_margin) * 100)
    elif growth_mom is not None and gross_margin is not None:
        rule_of_40 = round((growth_mom * 12 + gross_margin) * 100)

    # Recurring out $/mo: average of detected recurring payment monthly equivalents.
    recurring = ctx.recurring_payments
    recurring_out = sum(r.monthly_equivalent for r in recurring)

    tight_amount, tight_date = _tightest_day(snapshots, as_of=as_of)

    approvals = _approvals_pending(transactions)

    return CommandCenterStats(
        nrr_pct=nrr_pct,
        rule_of_40=rule_of_40,
        burn_multiple=burn_multiple,
        magic_number=magic_number,
        gross_margin_pct=gross_margin_pct,
        recurring_out_per_month=round(recurring_out, 2),
        tightest_day_amount=round(tight_amount, 2),
        tightest_day_date=tight_date.isoformat() if tight_date else None,
        approvals_pending_amount=round(approvals, 2),
    )


def build_command_center_payload(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
    runway_account_id: Optional[str] = None,
    runway_window: WindowPreset = "3m",
) -> Dict:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    return {
        "as_of": ctx.as_of.isoformat(),
        "accounts": [r.to_dict() for r in ctx.per_account_runway],
        "runway_series": runway_series(
            ctx.snapshots,
            as_of=ctx.as_of,
            account_id=runway_account_id,
            window=runway_window,
            per_acct=ctx.per_account_runway,
        ),
        "stats": ctx.command_center_stats.to_dict(),
    }
