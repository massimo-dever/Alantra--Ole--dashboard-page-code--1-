"""Per-request dashboard context.

Several dashboard sections need the *same* derived value (aggregated
transactions, recurring payments, command-center KPI stats, etc.). This module
gathers those shared transformations behind a small context object so each one
runs at most once per request, regardless of how many webpages compose it.

The context is intentionally request-scoped: snapshots can change between
requests (Plaid sync, manual entry, etc.) so caching across requests is the
caller's responsibility. Within a single request every section that needs e.g.
`command_center_stats` reuses the first call's result.

Usage::

    ctx = DashboardContext(snapshots, as_of=as_of)
    payload = build_command_center_payload(ctx, runway_window="3m")
"""

from __future__ import annotations

from datetime import date
from functools import cached_property
from typing import List, Optional, TYPE_CHECKING

from ..models import AccountSnapshot, NormalizedTransaction, RecurringPayment
from .core import aggregate_all_transactions, total_balance

if TYPE_CHECKING:
    from .command_center import AccountRunway, CommandCenterStats


class DashboardContext:
    """Request-scoped cache of shared dashboard transformations.

    Each cached property is computed lazily on first access and reused by every
    subsequent caller. The properties intentionally mirror the helper functions
    in :mod:`alantra_backend.transformations.*` – they're the *single source of
    truth* the page-level builders pull from.
    """

    def __init__(self, snapshots: List[AccountSnapshot], *, as_of: date):
        self.snapshots = snapshots
        self.as_of = as_of

    # ------------------------------------------------------------------
    # Lightweight aggregations
    # ------------------------------------------------------------------

    @cached_property
    def transactions(self) -> List[NormalizedTransaction]:
        return aggregate_all_transactions(self.snapshots)

    @cached_property
    def total_cash(self) -> float:
        return total_balance(self.snapshots)

    # ------------------------------------------------------------------
    # Recurring payments – used by Command Center, Cash Calendar and the
    # Recurring Outflow page.
    # ------------------------------------------------------------------

    @cached_property
    def recurring_payments(self) -> List[RecurringPayment]:
        from .recurring_outflow import detect_recurring_payments
        return detect_recurring_payments(self.transactions, as_of=self.as_of)

    # ------------------------------------------------------------------
    # Per-account runway – used by Command Center, Treasury and Cash
    # Intelligence's runway sensitivity calculations.
    # ------------------------------------------------------------------

    @cached_property
    def per_account_runway(self) -> "List[AccountRunway]":
        from .command_center import per_account_runway
        return per_account_runway(self.snapshots, as_of=self.as_of)

    # ------------------------------------------------------------------
    # Command-center KPI stats – also surfaced on Cash Intelligence's main
    # stats and efficiency table.
    # ------------------------------------------------------------------

    @cached_property
    def command_center_stats(self) -> "CommandCenterStats":
        from .command_center import command_center_stats
        return command_center_stats(self, _from_context=True)  # type: ignore[arg-type]

    # ------------------------------------------------------------------
    # Same KPI block as of the *prior* full month – needed for the
    # Efficiency stats table's MoM deltas.
    # ------------------------------------------------------------------

    @cached_property
    def prior_month_command_center_stats(self) -> "CommandCenterStats":
        from datetime import timedelta
        from dateutil.relativedelta import relativedelta
        from .command_center import command_center_stats

        prior_as_of = date(self.as_of.year, self.as_of.month, 1) - timedelta(days=1)
        prior_ctx = DashboardContext(self.snapshots, as_of=prior_as_of)
        return command_center_stats(prior_ctx, _from_context=True)  # type: ignore[arg-type]

    # ------------------------------------------------------------------
    # Helper for sections that want a sub-context (e.g. "command-center
    # stats as-of a different date").
    # ------------------------------------------------------------------

    def at(self, *, as_of: date) -> "DashboardContext":
        """Return a fresh context for ``as_of``. Caches are NOT shared because
        every cached value is sensitive to the as-of date."""

        return DashboardContext(self.snapshots, as_of=as_of)


def ensure_context(
    snapshots_or_ctx,
    *,
    as_of: Optional[date] = None,
) -> DashboardContext:
    """Accept either a ``DashboardContext`` or a list of snapshots and return a
    context. This lets the page-level builders be called either way without
    breaking existing call sites in the test-suite."""

    if isinstance(snapshots_or_ctx, DashboardContext):
        return snapshots_or_ctx
    if as_of is None:
        raise ValueError("as_of is required when passing snapshots directly")
    return DashboardContext(snapshots_or_ctx, as_of=as_of)
