"""Recurring outflow detection, table rendering and stats.

We detect recurring charges by grouping outflow transactions on
``(merchant_entity_id or vendor)`` and inspecting the spacing between
consecutive dates:

* Median gap 5-10 days  → Weekly
* Median gap 25-35 days → Monthly
* Median gap 85-100 days → Quarterly (we bucket as "Monthly" with 3× amount
  for the dashboard since the UI only exposes Weekly/Monthly/Annually)
* Median gap 330-400 days → Annually

Each detected group becomes a :class:`RecurringPayment` exposing the fields the
Recurring Outflow table requires. The spend-category split is also handled
here because every page that surfaces recurring spend needs the same
"infrastructure / marketing / SaaS / office / payroll" bucketing.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from statistics import median
from typing import Dict, Iterable, List, Optional

from dateutil.relativedelta import relativedelta

from ..models import NormalizedTransaction, RecurringPayment


# ---------------------------------------------------------------------------
# Category bucketing
# ---------------------------------------------------------------------------

# Tuples of (label, [substrings]). Matched against the vendor name first then
# the Plaid personal-finance-category fields.
_CATEGORY_RULES = [
    ("Payroll", ["payroll", "gusto", "deel", "remote payroll", "rippling"]),
    ("Infrastructure", [
        "amazon web services", "aws", "google cloud", "gcp", "azure", "cloudflare",
        "vercel", "netlify", "datadog", "new relic", "fastly",
    ]),
    ("SaaS", [
        "slack", "notion", "figma", "linear", "github", "hubspot", "salesforce",
        "google workspace", "openai", "zendesk", "atlassian", "jira", "confluence",
    ]),
    ("Marketing", [
        "google ads", "facebook ads", "linkedin ads", "ad spend", "webflow",
        "mailchimp", "intercom", "twilio",
    ]),
    ("Office", [
        "wework", "mindspace", "regus", "industrious", "office",
        "rent", "landlord",
    ]),
]


def classify_category(transaction: NormalizedTransaction) -> str:
    text_sources = [
        (transaction.vendor or "").lower(),
        (transaction.category or "").lower(),
        (transaction.subcategory or "").lower(),
    ]
    for label, needles in _CATEGORY_RULES:
        for needle in needles:
            if any(needle in src for src in text_sources):
                return label
    return "Other"


# ---------------------------------------------------------------------------
# Cadence detection
# ---------------------------------------------------------------------------

def _cadence_from_gap(median_gap_days: float) -> Optional[str]:
    # Weekly: 5-10 day spacing.
    if 5 <= median_gap_days <= 10:
        return "Weekly"
    # Biweekly payroll: 12-16 days. We roll this up into the UI "Monthly"
    # cadence and convert amounts in ``_monthly_equivalent``.
    if 12 <= median_gap_days <= 16:
        return "Monthly"
    if 25 <= median_gap_days <= 35:
        return "Monthly"
    if 85 <= median_gap_days <= 100:
        return "Monthly"  # quarterly grouped here, amount adjusted in monthly_eq
    if 330 <= median_gap_days <= 400:
        return "Annually"
    return None


def _monthly_equivalent(cadence: str, median_gap_days: float, avg_amount: float) -> float:
    if cadence == "Weekly":
        return avg_amount * (365 / 12) / 7
    if cadence == "Monthly":
        if 85 <= median_gap_days <= 100:
            return avg_amount / 3
        if 12 <= median_gap_days <= 16:
            # biweekly -> ~2.17 charges per month
            return avg_amount * (365 / 12) / median_gap_days
        return avg_amount
    if cadence == "Annually":
        return avg_amount / 12
    return 0.0


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

@dataclass
class _Group:
    key: str
    vendor: str
    category: str
    dates: List[date]
    amounts: List[float]


def _group_outflows(transactions: Iterable[NormalizedTransaction]) -> Dict[str, _Group]:
    groups: Dict[str, _Group] = {}
    for t in transactions:
        if t.pending or t.amount >= 0:
            continue
        key = (t.merchant_entity_id or t.vendor or "unknown").lower()
        amount = -t.amount
        if key in groups:
            g = groups[key]
            g.dates.append(t.date)
            g.amounts.append(amount)
        else:
            groups[key] = _Group(
                key=key,
                vendor=t.vendor or key,
                category=classify_category(t),
                dates=[t.date],
                amounts=[amount],
            )
    return groups


def detect_recurring_payments(
    transactions: Iterable[NormalizedTransaction],
    *,
    as_of: date,
) -> List[RecurringPayment]:
    groups = _group_outflows(transactions)
    out: List[RecurringPayment] = []

    for g in groups.values():
        if len(g.dates) < 2:
            continue
        ordered = sorted(zip(g.dates, g.amounts), key=lambda p: p[0])
        dates = [p[0] for p in ordered]
        amounts = [p[1] for p in ordered]

        gaps = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]
        med = median(gaps)
        cadence = _cadence_from_gap(med)
        if cadence is None:
            continue

        last_date = dates[-1]
        last_amount = amounts[-1]

        if cadence == "Weekly":
            expected_next = last_date + timedelta(days=7)
        elif cadence == "Annually":
            expected_next = last_date + timedelta(days=365)
        elif cadence == "Monthly" and 12 <= med <= 16:
            expected_next = last_date + timedelta(days=14)
        else:  # Monthly / quarterly
            expected_next = (last_date + relativedelta(months=1))

        days_until_next = (expected_next - as_of).days

        # Status:
        #   * "Paid" if the latest charge is within the last cadence window
        #   * "Overdue" if we expected another charge by now but haven't seen one
        #   * "Cancelled" if nothing has landed for > 2× the median gap
        overdue_threshold = as_of + timedelta(days=-int(med * 1.0))
        cancellation_threshold = as_of + timedelta(days=-int(med * 2.0))
        if last_date <= cancellation_threshold:
            status = "Cancelled"
        elif last_date <= overdue_threshold and days_until_next < 0:
            status = "Overdue"
        else:
            status = "Paid"

        avg_amount = sum(amounts) / len(amounts)

        out.append(
            RecurringPayment(
                vendor=g.vendor,
                category=g.category,
                cadence=cadence,
                last_charge=round(last_amount, 2),
                last_charge_date=last_date,
                next_due_in_days=days_until_next,
                status=status,
                monthly_equivalent=round(_monthly_equivalent(cadence, med, avg_amount), 2),
            )
        )

    # Sort by biggest monthly equivalent first – the UI leads with the largest.
    out.sort(key=lambda r: -r.monthly_equivalent)
    return out


# ---------------------------------------------------------------------------
# Recurring-outflow payload for the frontend
# ---------------------------------------------------------------------------

def _monthly_series_by_category(
    transactions: Iterable[NormalizedTransaction],
    *,
    as_of: date,
    months: int = 12,
) -> Dict[str, List[Dict]]:
    """Return ``{category: [{month, amount}...]}`` used by the line chart.

    The "all" key aggregates every category.
    """

    end = date(as_of.year, as_of.month, 1)
    start = end - relativedelta(months=months - 1)

    categories = {"all"} | {label for label, _ in _CATEGORY_RULES}
    series: Dict[str, Dict[str, float]] = {c: {} for c in categories}

    month = start
    while month <= end:
        for c in categories:
            series[c].setdefault(month.isoformat(), 0.0)
        month = month + relativedelta(months=1)

    for t in transactions:
        if t.amount >= 0 or t.pending:
            continue
        if t.date < start or t.date > as_of:
            continue
        mk = date(t.date.year, t.date.month, 1).isoformat()
        cat = classify_category(t)
        series["all"][mk] = series["all"].get(mk, 0.0) + -t.amount
        if cat in series:
            series[cat][mk] = series[cat].get(mk, 0.0) + -t.amount

    out: Dict[str, List[Dict]] = {}
    for cat, months_dict in series.items():
        out[cat] = [
            {"month": k, "amount": round(v, 2)}
            for k, v in sorted(months_dict.items())
        ]
    return out


def _category_percentages(recurring: List[RecurringPayment]) -> List[Dict]:
    total = sum(r.monthly_equivalent for r in recurring)
    buckets: Dict[str, float] = {}
    for r in recurring:
        buckets[r.category] = buckets.get(r.category, 0.0) + r.monthly_equivalent
    if total == 0:
        return [{"category": c, "pct": 0.0, "amount": 0.0} for c in buckets]
    return sorted(
        (
            {"category": c, "amount": round(v, 2), "pct": round(v / total * 100, 1)}
            for c, v in buckets.items()
        ),
        key=lambda x: -x["pct"],
    )


def _flag_for_review(r: RecurringPayment, *, as_of: date) -> Optional[date]:
    """Return an earliest review date if the payment should be flagged for
    review. We flag anything that:

    * is Annually billed and auto-renews in the next 60 days, or
    * has ``status == "Overdue"``, or
    * is marked as ``"Cancelled"`` so finance can confirm the termination.
    """

    if r.status in {"Overdue", "Cancelled"}:
        return as_of
    if r.cadence == "Annually" and r.next_due_in_days <= 60:
        return r.last_charge_date + timedelta(days=365)
    return None


def build_recurring_outflow_payload(
    transactions_or_ctx,
    *,
    as_of: Optional[date] = None,
) -> Dict:
    """Build the Recurring Outflow page payload.

    Accepts either a :class:`DashboardContext` (preferred — reuses the cached
    recurring-payment detection) or a raw iterable of normalised transactions.
    """

    from .context import DashboardContext

    if isinstance(transactions_or_ctx, DashboardContext):
        ctx = transactions_or_ctx
        transactions = ctx.transactions
        as_of = ctx.as_of
        recurring = ctx.recurring_payments
    else:
        if as_of is None:
            raise ValueError("as_of is required when passing transactions directly")
        transactions = list(transactions_or_ctx)
        recurring = detect_recurring_payments(transactions, as_of=as_of)

    monthly_recurring_out = sum(r.monthly_equivalent for r in recurring)

    # vs prior 3-month average of monthly recurring out. We approximate by
    # looking at the same detection but only at charges up to N months ago.
    def _recurring_at(as_of_inner: date) -> float:
        rs = detect_recurring_payments(
            (t for t in transactions if t.date <= as_of_inner),
            as_of=as_of_inner,
        )
        return sum(r.monthly_equivalent for r in rs)

    prior_values = [
        _recurring_at(as_of - relativedelta(months=k)) for k in (1, 2, 3)
    ]
    prior_avg = sum(prior_values) / len(prior_values) if prior_values else 0.0
    if prior_avg:
        delta_vs_prior = (monthly_recurring_out - prior_avg) / prior_avg
    else:
        delta_vs_prior = None

    locked_in = 0.0
    locked_vendors = set()
    for r in recurring:
        if r.status == "Cancelled":
            continue
        if r.cadence == "Annually":
            locked_in += r.last_charge  # one more renewal over the next 12mo
        elif r.cadence == "Monthly":
            locked_in += r.monthly_equivalent * 12
        elif r.cadence == "Weekly":
            locked_in += r.monthly_equivalent * 12
        locked_vendors.add(r.vendor)

    flagged = []
    for r in recurring:
        d = _flag_for_review(r, as_of=as_of)
        if d is not None:
            flagged.append((r, d))
    flagged_amount = sum(r.monthly_equivalent for r, _ in flagged)
    earliest_review = min((d for _, d in flagged), default=None)

    series = _monthly_series_by_category(transactions, as_of=as_of)
    categories = _category_percentages(recurring)

    return {
        "as_of": as_of.isoformat(),
        "main_stats": {
            "monthly_recurring_out": round(monthly_recurring_out, 2),
            "delta_vs_prior_3mo_avg": (round(delta_vs_prior * 100, 1) if delta_vs_prior is not None else None),
            "locked_in_12mo": round(locked_in, 2),
            "locked_in_vendor_count": len(locked_vendors),
            "flagged_for_review_amount": round(flagged_amount, 2),
            "flagged_for_review_count": len(flagged),
            "earliest_review_deadline": earliest_review.isoformat() if earliest_review else None,
        },
        "series_by_category": series,
        "category_breakdown_pct": categories,
        "payments": [r.model_dump() | {"last_charge_date": r.last_charge_date.isoformat()} for r in recurring],
    }
