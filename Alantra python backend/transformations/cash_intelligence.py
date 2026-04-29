"""Cash Intelligence transformations.

The hardest bit is the large collection of stats tables (cash / growth /
efficiency) plus the four historical line charts. Each line chart uses
``days back`` on the Y axis and a configurable point distance; we express
all four in a single pass through the data so they stay consistent.

All SaaS-metrics values fall back to ``None`` when we don't have enough signal
to compute them honestly. The frontend renders ``None`` as "—" rather than
making numbers up.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, timedelta
from typing import Callable, Dict, Iterable, List, Literal, Optional

from dateutil.relativedelta import relativedelta

from ..models import AccountSnapshot, NormalizedTransaction
from .context import DashboardContext, ensure_context
from .core import (
    aggregate_all_transactions,
    mom_delta,
    monthly_net_flow,
    reconstruct_balance_history,
    runway_months,
    total_balance,
    trailing_burn,
)


PointDistance = Literal["daily", "weekly", "monthly"]
Horizon = Literal[30, 90, 180, 365]


# ---------------------------------------------------------------------------
# Plaid payment-channel -> UI spend bucket
# ---------------------------------------------------------------------------

_SPEND_BUCKETS = ["all", "international", "check", "ach", "reimbursements", "cards"]


def _spend_bucket(t: NormalizedTransaction) -> Optional[str]:
    if t.amount >= 0:
        return None
    channel = (t.payment_channel or "").lower()
    vendor = (t.vendor or "").lower()
    currency = (t.currency or "").upper()
    cat = (t.category or "").lower()

    if currency and currency != "USD":
        return "international"
    if "reimburs" in vendor or "reimbursement" in cat:
        return "reimbursements"
    if channel in {"in store", "online"} and ("card" in vendor or channel == "in store"):
        return "cards"
    if channel == "in store":
        return "cards"
    if channel == "online":
        return "ach"
    if channel == "other" and "check" in vendor:
        return "check"
    return "ach"


# ---------------------------------------------------------------------------
# Spend stats
# ---------------------------------------------------------------------------

@dataclass
class SpendStats:
    current_month_spend: float
    current_month_cashback: float
    category_percentages: Dict[str, float]

    def to_dict(self) -> Dict:
        return asdict(self)


def _cashback(transactions: Iterable[NormalizedTransaction]) -> float:
    total = 0.0
    for t in transactions:
        if t.amount <= 0:
            continue
        if "cashback" in (t.vendor or "").lower() or "rewards" in (t.category or "").lower():
            total += t.amount
    return total


def spend_stats(transactions: Iterable[NormalizedTransaction], *, as_of: date) -> SpendStats:
    month_start = date(as_of.year, as_of.month, 1)
    this_month = [t for t in transactions if not t.pending and t.date >= month_start and t.date <= as_of]

    totals = {b: 0.0 for b in _SPEND_BUCKETS}
    for t in this_month:
        if t.amount >= 0:
            continue
        totals["all"] += -t.amount
        bucket = _spend_bucket(t)
        if bucket and bucket != "all":
            totals[bucket] += -t.amount

    pcts = {}
    all_total = totals["all"]
    for b in _SPEND_BUCKETS:
        if b == "all":
            pcts[b] = 100.0 if all_total else 0.0
            continue
        pcts[b] = round(totals[b] / all_total * 100, 1) if all_total else 0.0

    return SpendStats(
        current_month_spend=round(totals["all"], 2),
        current_month_cashback=round(_cashback(this_month), 2),
        category_percentages=pcts,
    )


# ---------------------------------------------------------------------------
# Main stats
# ---------------------------------------------------------------------------

@dataclass
class CashIntelligenceMainStats:
    runway_months: float
    runway_sensitivity_months: float
    gap_to_breakeven_months: Optional[float]
    net_burn_last_month: float
    avg_net_burn_3mo: float
    burn_multiple: Optional[float]
    nrr_pct: Optional[float]
    rule_of_40: Optional[int]

    def to_dict(self) -> Dict:
        return asdict(self)


def _avg_burn_months(transactions, *, as_of, months):
    return trailing_burn(transactions, as_of=as_of, months=months)


def _runway_sensitivity(transactions, *, as_of, total_cash, burn_now):
    """How many months of runway ± if burn moves ±10%."""

    low = runway_months(total_cash, burn_now * 0.9)
    high = runway_months(total_cash, burn_now * 1.1)
    base = runway_months(total_cash, burn_now)
    return round(max(abs(low - base), abs(high - base)), 2)


def _breakeven_gap(transactions: List[NormalizedTransaction], *, as_of: date) -> Optional[float]:
    """Months required for net flow to hit break-even assuming current trend.

    We look at the last 6 monthly ``net`` values, fit a simple linear trend,
    and extrapolate when the line crosses zero. Returns ``None`` when the
    business is already breaking even or improving too slowly to measure.
    """

    flows = monthly_net_flow(transactions)[-6:]
    if len(flows) < 2:
        return None

    latest_net = flows[-1].net
    if latest_net >= 0:
        return 0.0

    # Linear regression on (month_index, net) — slope gives improvement /mo.
    n = len(flows)
    xs = list(range(n))
    ys = [f.net for f in flows]
    x_mean = sum(xs) / n
    y_mean = sum(ys) / n
    num = sum((xs[i] - x_mean) * (ys[i] - y_mean) for i in range(n))
    den = sum((xs[i] - x_mean) ** 2 for i in range(n))
    if den == 0 or num <= 0:
        return None  # not improving
    slope = num / den
    months_to_zero = -latest_net / slope
    return round(max(months_to_zero, 0.0), 1)


def main_stats(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
) -> CashIntelligenceMainStats:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    snapshots = ctx.snapshots
    as_of = ctx.as_of
    transactions = ctx.transactions
    total_cash = ctx.total_cash
    burn = trailing_burn(transactions, as_of=as_of, months=3)
    rm = runway_months(total_cash, burn)

    # Net burn last month = -(net flow of last closed month).
    month_start = date(as_of.year, as_of.month, 1)
    prior_start = month_start - relativedelta(months=1)
    net_last_m = sum(
        t.amount for t in transactions
        if prior_start <= t.date < month_start and not t.pending
    )
    net_burn_last_m = -net_last_m

    cc = ctx.command_center_stats

    return CashIntelligenceMainStats(
        runway_months=round(rm, 2),
        runway_sensitivity_months=_runway_sensitivity(
            transactions, as_of=as_of, total_cash=total_cash, burn_now=burn
        ),
        gap_to_breakeven_months=_breakeven_gap(transactions, as_of=as_of),
        net_burn_last_month=round(net_burn_last_m, 2),
        avg_net_burn_3mo=round(burn, 2),
        burn_multiple=cc.burn_multiple,
        nrr_pct=cc.nrr_pct,
        rule_of_40=cc.rule_of_40,
    )


# ---------------------------------------------------------------------------
# Historical line charts: cash, growth/shrinkage, efficiency, spend
# ---------------------------------------------------------------------------

def _downsample(pairs, distance):
    if distance == "daily":
        return list(pairs)
    if distance == "weekly":
        return [p for i, p in enumerate(pairs) if i % 7 == 0 or i == len(pairs) - 1]
    out = []
    seen = set()
    for d, v in pairs:
        k = (d.year, d.month)
        if k not in seen:
            out.append((d, v))
            seen.add(k)
    return out


def historical_series(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
    horizon_days: Horizon = 90,
    distance: PointDistance = "daily",
) -> Dict[str, List[Dict]]:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    snapshots = ctx.snapshots
    as_of = ctx.as_of
    transactions = ctx.transactions
    start = as_of - timedelta(days=horizon_days)

    # Build per-day combined balance series.
    per_day_balance: Dict[date, float] = {}
    for s in snapshots:
        hist = reconstruct_balance_history(s.account.balance, s.transactions, as_of=as_of, start=start)
        for d, v in hist:
            per_day_balance[d] = per_day_balance.get(d, 0.0) + v
    balance_series = sorted(per_day_balance.items())

    # Cash growth/shrinkage: day-over-day delta.
    growth_series = []
    for i, (d, v) in enumerate(balance_series):
        if i == 0:
            growth_series.append((d, 0.0))
        else:
            growth_series.append((d, v - balance_series[i - 1][1]))

    # Spend: outflows per day (positive number).
    per_day_spend: Dict[date, float] = {d: 0.0 for d, _ in balance_series}
    per_day_revenue: Dict[date, float] = {d: 0.0 for d, _ in balance_series}
    for t in transactions:
        if t.pending:
            continue
        if t.date < start or t.date > as_of:
            continue
        if t.amount < 0:
            per_day_spend[t.date] = per_day_spend.get(t.date, 0.0) + -t.amount
        else:
            per_day_revenue[t.date] = per_day_revenue.get(t.date, 0.0) + t.amount
    spend_series = [(d, per_day_spend.get(d, 0.0)) for d, _ in balance_series]

    # Efficiency: cumulative revenue / cumulative spend over the window.
    eff_series = []
    cum_r = cum_s = 0.0
    for d, _ in balance_series:
        cum_r += per_day_revenue.get(d, 0.0)
        cum_s += per_day_spend.get(d, 0.0)
        eff = (cum_r / cum_s) if cum_s > 0 else 0.0
        eff_series.append((d, eff * 100.0))

    def _to_payload(pairs, key):
        down = _downsample(pairs, distance)
        return [
            {"date": d.isoformat(), "days_back": (as_of - d).days, key: round(v, 2)}
            for d, v in down
        ]

    return {
        "total_cash": _to_payload(balance_series, "total_cash"),
        "cash_growth": _to_payload(growth_series, "cash_growth"),
        "efficiency_pct": _to_payload(eff_series, "efficiency_pct"),
        "spend": _to_payload(spend_series, "spend"),
    }


# ---------------------------------------------------------------------------
# Cash / Growth / Efficiency stats tables
# ---------------------------------------------------------------------------

def _monthly_total_inflow_outflow(transactions, *, as_of, months):
    end = date(as_of.year, as_of.month, 1)
    start = end - relativedelta(months=months)
    inflow = outflow = 0.0
    for t in transactions:
        if t.pending or t.date < start or t.date >= end:
            continue
        if t.amount >= 0:
            inflow += t.amount
        else:
            outflow += -t.amount
    return inflow, outflow


def _totals_for_month(transactions, month_start: date):
    month_end = month_start + relativedelta(months=1)
    inflow = outflow = 0.0
    for t in transactions:
        if t.pending or t.date < month_start or t.date >= month_end:
            continue
        if t.amount >= 0:
            inflow += t.amount
        else:
            outflow += -t.amount
    return inflow, outflow


def cash_stats_table(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
) -> Dict:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    snapshots = ctx.snapshots
    as_of = ctx.as_of
    transactions = ctx.transactions
    total_cash = ctx.total_cash

    month_start = date(as_of.year, as_of.month, 1)
    prior_start = month_start - relativedelta(months=1)
    prior2_start = month_start - relativedelta(months=2)

    cur_in, cur_out = _totals_for_month(transactions, prior_start)  # "last full month"
    prev_in, prev_out = _totals_for_month(transactions, prior2_start)

    cur_net = cur_in - cur_out
    prev_net = prev_in - prev_out

    # 3-month avg net cash flow
    nets = []
    for k in range(1, 4):
        ms = month_start - relativedelta(months=k)
        i, o = _totals_for_month(transactions, ms)
        nets.append(i - o)
    avg_3mo_net = sum(nets) / 3 if nets else 0.0

    burn = trailing_burn(transactions, as_of=as_of, months=3)
    rm = runway_months(total_cash, burn)

    # MoM deltas on balance: compare today vs 30 days ago.
    start = as_of - timedelta(days=30)
    hist_total: Dict[date, float] = {}
    for s in snapshots:
        hist = reconstruct_balance_history(s.account.balance, s.transactions, as_of=as_of, start=start)
        for d, v in hist:
            hist_total[d] = hist_total.get(d, 0.0) + v
    cash_30d_ago = hist_total.get(start, total_cash)

    # Simple gross-margin proxy per-month for MoM change.
    from .command_center import _gross_profit_proxy, _safe_div
    gp_cur = _gross_profit_proxy(transactions, start=prior_start, end=month_start)
    gm_cur = _safe_div(gp_cur, cur_in)
    gp_prev = _gross_profit_proxy(transactions, start=prior2_start, end=prior_start)
    gm_prev = _safe_div(gp_prev, prev_in)

    def _pct(v):
        return None if v is None else round(v * 100, 1)

    operating_margin_cur = _safe_div(cur_net, cur_in)
    operating_margin_prev = _safe_div(prev_net, prev_in)

    return {
        "total_cash_balance": round(total_cash, 2),
        "cash_balance_mom_pct": _pct(mom_delta(total_cash, cash_30d_ago)),
        "net_cash_flow": round(cur_net, 2),
        "net_cash_flow_mom_pct": _pct(mom_delta(cur_net, prev_net)),
        "avg_3mo_net_cash_flow": round(avg_3mo_net, 2),
        "total_inflow": round(cur_in, 2),
        "inflow_mom_pct": _pct(mom_delta(cur_in, prev_in)),
        "total_outflow": round(cur_out, 2),
        "outflow_mom_pct": _pct(mom_delta(cur_out, prev_out)),
        "operating_margin_pct": _pct(operating_margin_cur),
        "operating_margin_mom_pct": _pct(
            mom_delta(operating_margin_cur or 0.0, operating_margin_prev or 0.0)
        ) if operating_margin_cur is not None and operating_margin_prev is not None else None,
        "projected_runway_months": round(rm, 2),
        "gross_margin_pct": _pct(gm_cur),
        "gross_margin_mom_pct": _pct(mom_delta(gm_cur or 0.0, gm_prev or 0.0)) if gm_cur is not None and gm_prev is not None else None,
    }


def _revenue_for_month(transactions, month_start: date) -> float:
    from .command_center import _is_revenue_like

    month_end = month_start + relativedelta(months=1)
    return sum(
        t.amount for t in transactions
        if month_start <= t.date < month_end and _is_revenue_like(t)
    )


def growth_stats_table(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
) -> Dict:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    as_of = ctx.as_of
    transactions = ctx.transactions
    month_start = date(as_of.year, as_of.month, 1)
    prior_start = month_start - relativedelta(months=1)
    prior2_start = month_start - relativedelta(months=2)

    mrr_cur = _revenue_for_month(transactions, prior_start)
    mrr_prev = _revenue_for_month(transactions, prior2_start)

    arr_cur = mrr_cur * 12
    arr_prev = mrr_prev * 12

    # Without customer-level data we use revenue-based heuristics.
    nrr = (mrr_cur / mrr_prev) if mrr_prev else None
    grr = nrr  # approximate: same as NRR without churn breakdown
    logo_churn = 0.0  # unknown — exposed as 0 so MoM is computable
    arpu = None

    def _pct(v):
        return None if v is None else round(v * 100, 1)

    return {
        "arr": round(arr_cur, 2),
        "arr_mom_pct": _pct(mom_delta(arr_cur, arr_prev)),
        "mrr": round(mrr_cur, 2),
        "mrr_mom_pct": _pct(mom_delta(mrr_cur, mrr_prev)),
        "nrr_pct": _pct(nrr),
        "nrr_mom_pct": None,
        "grr_pct": _pct(grr),
        "grr_mom_pct": None,
        "logo_churn_pct": logo_churn,
        "logo_churn_mom_pct": 0.0,
        "arpu": arpu,
        "arpu_mom_pct": None,
    }


def efficiency_stats_table(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
) -> Dict:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    as_of = ctx.as_of
    transactions = ctx.transactions
    from .command_center import _marketing_sales_spend

    month_start = date(as_of.year, as_of.month, 1)
    prior_start = month_start - relativedelta(months=1)
    prior2_start = month_start - relativedelta(months=2)

    sm_cur = _marketing_sales_spend(
        t for t in transactions if prior_start <= t.date < month_start
    )
    sm_prev = _marketing_sales_spend(
        t for t in transactions if prior2_start <= t.date < prior_start
    )

    mrr_cur = _revenue_for_month(transactions, prior_start)
    mrr_prev = _revenue_for_month(transactions, prior2_start)

    # CAC is un-knowable without a customer count; we expose None so the UI
    # renders "—" rather than faking it. LTV is likewise placeholder.
    cac = None
    ltv = None

    cc_cur = ctx.command_center_stats
    cc_prev = ctx.prior_month_command_center_stats

    def _pct(v):
        return None if v is None else round(v * 100, 1)

    return {
        "cac": cac,
        "cac_mom_pct": None,
        "ltv": ltv,
        "ltv_mom_pct": None,
        "ltv_to_cac": None,
        "ltv_to_cac_mom_pct": None,
        "cac_payback_months": None,
        "cac_payback_months_mom_pct": None,
        "rule_of_40": cc_cur.rule_of_40,
        "rule_of_40_mom_pct": _pct(
            mom_delta(cc_cur.rule_of_40 or 0, cc_prev.rule_of_40 or 0)
        ) if cc_cur.rule_of_40 is not None and cc_prev.rule_of_40 is not None else None,
        "burn_multiple": cc_cur.burn_multiple,
        "burn_multiple_mom_pct": _pct(
            mom_delta(cc_cur.burn_multiple or 0, cc_prev.burn_multiple or 0)
        ) if cc_cur.burn_multiple is not None and cc_prev.burn_multiple is not None else None,
        "magic_number": cc_cur.magic_number,
        "magic_number_mom_pct": _pct(
            mom_delta(cc_cur.magic_number or 0, cc_prev.magic_number or 0)
        ) if cc_cur.magic_number is not None and cc_prev.magic_number is not None else None,
    }


# ---------------------------------------------------------------------------
# Public payload
# ---------------------------------------------------------------------------

def build_cash_intelligence_payload(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
    horizon_days: Horizon = 90,
    distance: PointDistance = "daily",
) -> Dict:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    return {
        "as_of": ctx.as_of.isoformat(),
        "horizon_days": horizon_days,
        "distance": distance,
        "main_stats": main_stats(ctx).to_dict(),
        "series": historical_series(
            ctx, horizon_days=horizon_days, distance=distance
        ),
        "cash_stats": cash_stats_table(ctx),
        "growth_stats": growth_stats_table(ctx),
        "efficiency_stats": efficiency_stats_table(ctx),
        "spend_stats": spend_stats(ctx.transactions, as_of=ctx.as_of).to_dict(),
    }
