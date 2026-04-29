"""Treasury transformations (Metrics & Monitoring → Treasury).

Handles both the "all entities" stats view and the per-account view plus the
three alert families:

* **runway-imbalance alerts** – if one account's runway is >10% lower than
  another's, we compute the optimal transfer that equalises their runways and
  emit the resulting runway change for both accounts.
* **APY-opportunity alerts** – accounts that are sitting on >12 months of
  runway while *not* being the highest-APY account get a "sweep into HYSA"
  suggestion.
* **target-shortfall alerts** – accounts below their configured target
  balance.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, timedelta
from typing import Dict, List, Literal, Optional

from dateutil.relativedelta import relativedelta

from ..models import AccountSnapshot, AccountType
from .command_center import AccountRunway, per_account_runway
from .context import DashboardContext, ensure_context
from .core import (
    aggregate_all_transactions,
    reconstruct_balance_history,
    runway_months,
    total_balance,
    trailing_burn,
)


WindowMonths = Literal[1, 3, 6, 12, 24]


# ---------------------------------------------------------------------------
# Main-stats helpers
# ---------------------------------------------------------------------------

def _is_cash_at_work(account_type: AccountType) -> bool:
    return account_type in {AccountType.SAVINGS, AccountType.TERM}


@dataclass
class TreasuryStats:
    total_cash: float
    cash_at_work_pct: float
    best_apy: float
    min_entity_runway_months: float

    def to_dict(self) -> Dict:
        return asdict(self)


def aggregated_stats(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
) -> TreasuryStats:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    snapshots = ctx.snapshots
    runways = ctx.per_account_runway
    total = sum(r.balance for r in runways)
    at_work = sum(
        r.balance for r, s in zip(runways, snapshots)
        if _is_cash_at_work(s.account.type)
    )
    # Only count savings / term accounts toward "best APY" – checking accounts
    # rarely offer meaningful rates.
    yield_accounts = [s for s in snapshots if _is_cash_at_work(s.account.type)]
    best_apy = max((s.account.apy for s in yield_accounts), default=0.0)

    # Min entity runway: group accounts by entity, aggregate, then pick min.
    by_entity: Dict[str, Dict[str, float]] = {}
    for r, s in zip(runways, snapshots):
        ent = by_entity.setdefault(s.account.entity, {"balance": 0.0, "net3": 0.0})
        ent["balance"] += r.balance
        ent["net3"] += r.net_3mo
    min_runway = float("inf")
    for ent, vals in by_entity.items():
        burn = -(vals["net3"] / 3.0)
        rm = runway_months(vals["balance"], burn)
        if rm < min_runway:
            min_runway = rm
    if min_runway == float("inf"):
        min_runway = 0.0

    return TreasuryStats(
        total_cash=round(total, 2),
        cash_at_work_pct=round((at_work / total * 100) if total else 0.0, 1),
        best_apy=best_apy,
        min_entity_runway_months=round(min_runway, 2),
    )


@dataclass
class PerAccountTreasuryStats:
    account_id: str
    name: str
    entity: str
    cash: float
    cash_at_work_pct: float
    apy: float
    runway_months: float

    def to_dict(self) -> Dict:
        return asdict(self)


def per_account_stats(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
) -> List[PerAccountTreasuryStats]:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    snapshots = ctx.snapshots
    runways = ctx.per_account_runway
    out: List[PerAccountTreasuryStats] = []
    for r, s in zip(runways, snapshots):
        out.append(
            PerAccountTreasuryStats(
                account_id=s.account.id,
                name=s.account.name,
                entity=s.account.entity,
                cash=round(r.balance, 2),
                cash_at_work_pct=100.0 if _is_cash_at_work(s.account.type) else 0.0,
                apy=s.account.apy,
                runway_months=round(r.runway_months, 2),
            )
        )
    return out


# ---------------------------------------------------------------------------
# Total-cash graph
# ---------------------------------------------------------------------------

def total_cash_series(
    snapshots: List[AccountSnapshot],
    *,
    as_of: date,
    months_back: int = 6,
) -> List[Dict]:
    start = as_of - relativedelta(months=months_back)
    per_day: Dict[date, float] = {}
    for s in snapshots:
        history = reconstruct_balance_history(
            s.account.balance, s.transactions, as_of=as_of, start=start
        )
        for d, b in history:
            per_day[d] = per_day.get(d, 0.0) + b
    return [
        {"date": d.isoformat(), "total_cash": round(b, 2)}
        for d, b in sorted(per_day.items())
    ]


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

@dataclass
class TreasuryAlert:
    type: str
    severity: str  # "info" | "warning" | "critical"
    message: str
    details: Dict

    def to_dict(self) -> Dict:
        return asdict(self)


def _transfer_to_equalize(high: AccountRunway, low: AccountRunway) -> Optional[Dict]:
    """Solve for the amount ``x`` to move from ``high`` → ``low`` so that
    ``(high.balance - x) / high.burn == (low.balance + x) / low.burn``.

    Rearranges to ``x = (high.balance * low.burn - low.balance * high.burn) / (low.burn + high.burn)``.
    """

    hb, lb = high.burn_per_month, low.burn_per_month
    if hb + lb <= 0:
        return None
    x = (high.balance * lb - low.balance * hb) / (lb + hb)
    if x <= 0:
        return None
    new_high = high.balance - x
    new_low = low.balance + x
    return {
        "transfer_amount": round(x, 2),
        "from_account_id": high.account_id,
        "to_account_id": low.account_id,
        "runway_before": {
            high.account_id: round(high.runway_months, 2),
            low.account_id: round(low.runway_months, 2),
        },
        "runway_after": {
            high.account_id: round(runway_months(new_high, hb), 2),
            low.account_id: round(runway_months(new_low, lb), 2),
        },
    }


def _runway_imbalance_alerts(
    runways: List[AccountRunway],
    *,
    threshold_pct: float,
) -> List[TreasuryAlert]:
    finite = [r for r in runways if r.burn_per_month > 0]
    if len(finite) < 2:
        return []

    alerts: List[TreasuryAlert] = []
    for low in finite:
        for high in finite:
            if high.account_id == low.account_id:
                continue
            if high.runway_months <= low.runway_months:
                continue
            # (high - low) / high > threshold, i.e. low is >threshold% worse.
            if (high.runway_months - low.runway_months) / high.runway_months < threshold_pct:
                continue
            plan = _transfer_to_equalize(high, low)
            if plan is None:
                continue
            alerts.append(
                TreasuryAlert(
                    type="runway_imbalance",
                    severity="warning",
                    message=(
                        f"{low.name} has {low.runway_months:.1f}mo runway vs "
                        f"{high.name} at {high.runway_months:.1f}mo. Transfer "
                        f"${plan['transfer_amount']:,.0f} to equalize."
                    ),
                    details=plan,
                )
            )

    # De-duplicate: keep only the best suggestion per (from, to) pair.
    best: Dict[tuple, TreasuryAlert] = {}
    for a in alerts:
        k = (a.details["from_account_id"], a.details["to_account_id"])
        if k not in best or a.details["transfer_amount"] > best[k].details["transfer_amount"]:
            best[k] = a
    return list(best.values())


def _apy_opportunity_alerts(
    snapshots: List[AccountSnapshot],
    runways: List[AccountRunway],
    *,
    target_runway_months: float,
) -> List[TreasuryAlert]:
    yield_accounts = [s for s in snapshots if _is_cash_at_work(s.account.type)]
    if not yield_accounts:
        return []
    best = max(yield_accounts, key=lambda s: s.account.apy)
    best_apy = best.account.apy
    alerts: List[TreasuryAlert] = []

    for r, s in zip(runways, snapshots):
        if s.account.id == best.account.id:
            continue
        if s.account.apy >= best_apy:
            continue
        if r.runway_months <= target_runway_months:
            continue
        # Move everything above 12-mo runway's worth of cash.
        keep = target_runway_months * r.burn_per_month if r.burn_per_month > 0 else 0.0
        excess = max(r.balance - keep, 0.0)
        if excess <= 0:
            continue
        alerts.append(
            TreasuryAlert(
                type="apy_opportunity",
                severity="info",
                message=(
                    f"{s.account.name} has {r.runway_months:.1f}mo of runway at "
                    f"{s.account.apy*100:.2f}% APY. Sweep ${excess:,.0f} into "
                    f"{best.account.name} ({best_apy*100:.2f}% APY)."
                ),
                details={
                    "from_account_id": s.account.id,
                    "to_account_id": best.account.id,
                    "sweep_amount": round(excess, 2),
                    "current_apy": s.account.apy,
                    "target_apy": best_apy,
                    "annual_yield_uplift": round(excess * (best_apy - s.account.apy), 2),
                },
            )
        )
    return alerts


def _target_shortfall_alerts(snapshots: List[AccountSnapshot]) -> List[TreasuryAlert]:
    alerts: List[TreasuryAlert] = []
    for s in snapshots:
        target = s.account.metadata.target_balance
        if target is None:
            continue
        if s.account.balance < target:
            shortfall = target - s.account.balance
            alerts.append(
                TreasuryAlert(
                    type="target_shortfall",
                    severity="warning",
                    message=(
                        f"{s.account.name} is ${shortfall:,.0f} below its "
                        f"${target:,.0f} target."
                    ),
                    details={
                        "account_id": s.account.id,
                        "target": target,
                        "current_balance": s.account.balance,
                        "top_up_amount": round(shortfall, 2),
                    },
                )
            )
    return alerts


def build_treasury_alerts(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
    runway_imbalance_threshold: float = 0.10,
    target_runway_months: float = 12.0,
) -> List[TreasuryAlert]:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    snapshots = ctx.snapshots
    runways = ctx.per_account_runway
    return (
        _runway_imbalance_alerts(runways, threshold_pct=runway_imbalance_threshold)
        + _apy_opportunity_alerts(
            snapshots, runways, target_runway_months=target_runway_months
        )
        + _target_shortfall_alerts(snapshots)
    )


# ---------------------------------------------------------------------------
# Public payload
# ---------------------------------------------------------------------------

def build_treasury_payload(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
    months_back: int = 6,
) -> Dict:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    return {
        "as_of": ctx.as_of.isoformat(),
        "aggregated_stats": aggregated_stats(ctx).to_dict(),
        "per_account_stats": [p.to_dict() for p in per_account_stats(ctx)],
        "total_cash_series": total_cash_series(
            ctx.snapshots, as_of=ctx.as_of, months_back=months_back
        ),
        "alerts": [a.to_dict() for a in build_treasury_alerts(ctx)],
    }
