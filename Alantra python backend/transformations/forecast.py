"""Budgets & Forecasts – Forecast & Scenarios.

Produces:

* Main-stats table (runway, cash-at-start, cash-at-end-of-horizon, delta,
  avg 3-month base-scenario burn).
* Cash trajectory graph with *base / upside / downside* lines and the
  horizontal zero line the UI overlays.
* Large "scenario planning" table covering Revenue / COGS / Headcount with
  reasonable default rows the frontend can render and edit.
* Computed P&L table per month for the chosen scenario.

The scenario model is deliberately simple: we derive defaults from the
trailing 3-month financial history, then let callers override individual
fields. That's enough to populate the UI today, and it leaves an obvious
extension point for the eventual AI-calculated values.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Dict, List, Optional

from dateutil.relativedelta import relativedelta

from ..models import AccountSnapshot
from .cash_intelligence import _revenue_for_month, _totals_for_month
from .command_center import _gross_profit_proxy, _marketing_sales_spend
from .context import DashboardContext, ensure_context
from .core import (
    aggregate_all_transactions,
    monthly_net_flow,
    runway_months,
    total_balance,
    trailing_burn,
)


# ---------------------------------------------------------------------------
# Default scenario templates
# ---------------------------------------------------------------------------

_DEFAULT_DEPARTMENTS: List[Dict] = [
    {"name": "Engineering", "headcount": 18, "planned_hires": 2, "avg_fully_loaded_cost": 18_500, "attrition_pct": 0.05},
    {"name": "Sales",        "headcount": 8,  "planned_hires": 1, "avg_fully_loaded_cost": 16_000, "attrition_pct": 0.08},
    {"name": "Marketing",    "headcount": 5,  "planned_hires": 1, "avg_fully_loaded_cost": 14_500, "attrition_pct": 0.06},
    {"name": "Management",   "headcount": 4,  "planned_hires": 0, "avg_fully_loaded_cost": 22_000, "attrition_pct": 0.02},
    {"name": "HR",           "headcount": 3,  "planned_hires": 0, "avg_fully_loaded_cost": 12_000, "attrition_pct": 0.04},
]

_DEFAULT_COGS: List[Dict] = [
    {"name": "Hosting & Infrastructure", "monthly_cost": 18_000},
    {"name": "Third-party APIs",          "monthly_cost":  6_500},
    {"name": "Customer Support HC",       "monthly_cost": 14_000},
]


# ---------------------------------------------------------------------------
# Scenario data structures
# ---------------------------------------------------------------------------

@dataclass
class ScenarioRevenue:
    starting_mrr: float
    new_mrr_per_month: float
    expansion_pct: float     # % of starting MRR gained from expansion each month
    contraction_pct: float   # % of starting MRR lost from contraction each month
    churn_pct: float         # % of starting MRR lost from churn each month


@dataclass
class ScenarioCOGS:
    lines: List[Dict] = field(default_factory=lambda: deepcopy(_DEFAULT_COGS))


@dataclass
class ScenarioHeadcount:
    departments: List[Dict] = field(default_factory=lambda: deepcopy(_DEFAULT_DEPARTMENTS))


@dataclass
class Scenario:
    name: str
    revenue: ScenarioRevenue
    cogs: ScenarioCOGS
    headcount: ScenarioHeadcount
    growth_multiplier: float = 1.0   # applied to new_mrr_per_month
    opex_multiplier: float = 1.0     # applied to HC + non-COGS opex

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "revenue": asdict(self.revenue),
            "cogs": asdict(self.cogs),
            "headcount": asdict(self.headcount),
            "growth_multiplier": self.growth_multiplier,
            "opex_multiplier": self.opex_multiplier,
        }


# ---------------------------------------------------------------------------
# Default scenario from history
# ---------------------------------------------------------------------------

def _derive_base_scenario(ctx: DashboardContext) -> Scenario:
    transactions = ctx.transactions
    as_of = ctx.as_of
    month_start = date(as_of.year, as_of.month, 1)
    prior_start = month_start - relativedelta(months=1)
    prior2_start = month_start - relativedelta(months=2)

    mrr = _revenue_for_month(transactions, prior_start)
    prev = _revenue_for_month(transactions, prior2_start)

    new_mrr = max(mrr - prev, 0.0)
    churn_pct = 0.02  # 2%/mo baseline — conservative default
    return Scenario(
        name="Base",
        revenue=ScenarioRevenue(
            starting_mrr=round(mrr, 2),
            new_mrr_per_month=round(new_mrr, 2),
            expansion_pct=0.03,
            contraction_pct=0.01,
            churn_pct=churn_pct,
        ),
        cogs=ScenarioCOGS(),
        headcount=ScenarioHeadcount(),
    )


# ---------------------------------------------------------------------------
# Scenario projection
# ---------------------------------------------------------------------------

def project_scenario(
    scenario: Scenario,
    *,
    start_cash: float,
    horizon_months: int,
    start_month: date,
) -> Dict:
    """Return one row per month over ``horizon_months``.

    Each row has the full set of fields the big scenario-planning table needs
    (MRR start, new MRR, expansion/contraction/churn, ending MRR, ARR, COGS
    breakdown, HC breakdown, total OpEx, EBITDA, ending cash).
    """

    months: List[Dict] = []
    mrr = scenario.revenue.starting_mrr
    cash = start_cash
    cur = start_month

    for i in range(horizon_months):
        new_mrr = scenario.revenue.new_mrr_per_month * scenario.growth_multiplier
        expansion = mrr * scenario.revenue.expansion_pct
        contraction = mrr * scenario.revenue.contraction_pct
        churn = mrr * scenario.revenue.churn_pct

        ending_mrr = mrr + new_mrr + expansion - contraction - churn
        arr = ending_mrr * 12

        cogs_total = sum(line["monthly_cost"] for line in scenario.cogs.lines)
        dept_rows: List[Dict] = []
        hc_total = 0.0
        for dept in scenario.headcount.departments:
            dept_cost = dept["headcount"] * dept["avg_fully_loaded_cost"] * scenario.opex_multiplier
            attrition_savings = dept_cost * dept["attrition_pct"]
            effective = dept_cost - attrition_savings
            hc_total += effective
            dept_rows.append(
                {
                    "name": dept["name"],
                    "headcount": dept["headcount"],
                    "planned_hires": dept["planned_hires"],
                    "avg_fully_loaded_cost": dept["avg_fully_loaded_cost"],
                    "attrition_pct": dept["attrition_pct"],
                    "total_hc_cost": round(effective, 2),
                }
            )

        revenue = (mrr + ending_mrr) / 2  # simple avg for the month
        gross_margin_pct = ((revenue - cogs_total) / revenue) if revenue else None
        opex = hc_total
        ebitda = revenue - cogs_total - opex
        cash += ebitda

        months.append(
            {
                "month_index": i,
                "month": cur.isoformat(),
                "revenue": {
                    "starting_mrr": round(mrr, 2),
                    "new_mrr": round(new_mrr, 2),
                    "expansion_mrr_pct": scenario.revenue.expansion_pct,
                    "contraction_mrr_pct": scenario.revenue.contraction_pct,
                    "churn_mrr_pct": scenario.revenue.churn_pct,
                    "ending_mrr": round(ending_mrr, 2),
                    "arr": round(arr, 2),
                },
                "cogs": {
                    "lines": [dict(line) for line in scenario.cogs.lines],
                    "total_cogs": round(cogs_total, 2),
                    "gross_margin_pct": round(gross_margin_pct * 100, 1) if gross_margin_pct is not None else None,
                },
                "headcount": {
                    "departments": dept_rows,
                    "total_hc_cost": round(hc_total, 2),
                },
                "pnl": {
                    "revenue": round(revenue, 2),
                    "cogs": round(cogs_total, 2),
                    "gross_margin_pct": round(gross_margin_pct * 100, 1) if gross_margin_pct is not None else None,
                    "opex": round(opex, 2),
                    "ebitda": round(ebitda, 2),
                    "ending_cash": round(cash, 2),
                },
            }
        )

        mrr = ending_mrr
        cur = cur + relativedelta(months=1)

    return {
        "scenario": scenario.to_dict(),
        "months": months,
    }


# ---------------------------------------------------------------------------
# Public payload
# ---------------------------------------------------------------------------

def _clone_with_growth(base: Scenario, *, name: str, growth: float, opex: float) -> Scenario:
    return Scenario(
        name=name,
        revenue=ScenarioRevenue(
            starting_mrr=base.revenue.starting_mrr,
            new_mrr_per_month=base.revenue.new_mrr_per_month,
            expansion_pct=base.revenue.expansion_pct,
            contraction_pct=base.revenue.contraction_pct,
            churn_pct=base.revenue.churn_pct,
        ),
        cogs=ScenarioCOGS(lines=deepcopy(base.cogs.lines)),
        headcount=ScenarioHeadcount(departments=deepcopy(base.headcount.departments)),
        growth_multiplier=growth,
        opex_multiplier=opex,
    )


def build_forecast_payload(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
    horizon_months: int = 12,
    selected_scenario: str = "Base",
    custom_scenarios: Optional[List[Scenario]] = None,
) -> Dict:
    ctx = ensure_context(snapshots_or_ctx, as_of=as_of)
    as_of = ctx.as_of

    base = _derive_base_scenario(ctx)
    upside = _clone_with_growth(base, name="Upside", growth=1.5, opex=1.0)
    downside = _clone_with_growth(base, name="Downside", growth=0.5, opex=1.1)
    scenarios: List[Scenario] = [base, upside, downside] + list(custom_scenarios or [])

    start_cash = ctx.total_cash
    start_month = date(as_of.year, as_of.month, 1) + relativedelta(months=1)

    projections = {
        s.name: project_scenario(
            s, start_cash=start_cash, horizon_months=horizon_months, start_month=start_month
        )
        for s in scenarios
    }

    trajectories = {
        name: [{"month": m["month"], "cash": m["pnl"]["ending_cash"]} for m in payload["months"]]
        for name, payload in projections.items()
    }

    selected = projections.get(selected_scenario, projections["Base"])
    ending_cash = selected["months"][-1]["pnl"]["ending_cash"] if selected["months"] else start_cash
    diff_pct = (ending_cash - start_cash) / start_cash * 100 if start_cash else None
    runway_val = runway_months(
        ending_cash,
        max(-selected["months"][-1]["pnl"]["ebitda"], 0) if selected["months"] else 0,
    ) if selected["months"] else 0

    avg_burn_3mo_base = trailing_burn(ctx.transactions, as_of=as_of, months=3)

    return {
        "as_of": as_of.isoformat(),
        "horizon_months": horizon_months,
        "main_stats": {
            "runway_months": round(runway_val, 2),
            "cash_at_start_of_horizon": round(start_cash, 2),
            "cash_at_end_of_horizon": round(ending_cash, 2),
            "diff_pct": round(diff_pct, 1) if diff_pct is not None else None,
            "avg_monthly_burn_next_3mo_base": round(avg_burn_3mo_base, 2),
        },
        "trajectories": trajectories,
        "reference_lines": {"zero": 0},
        "scenarios": {name: p for name, p in projections.items()},
        "selected_scenario": selected_scenario,
    }
