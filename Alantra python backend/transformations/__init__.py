"""Dashboard-section transformations.

Each module exposes a ``build_<section>_payload`` function that takes a list of
``AccountSnapshot`` instances (plus section-specific filters) and returns a
plain JSON-ready dict the frontend can render without further processing.
"""

from . import (
    cash_calendar,
    cash_intelligence,
    command_center,
    context,
    core,
    forecast,
    recurring_outflow,
    treasury,
)
from .context import DashboardContext

__all__ = [
    "DashboardContext",
    "cash_calendar",
    "cash_intelligence",
    "command_center",
    "context",
    "core",
    "forecast",
    "recurring_outflow",
    "treasury",
]
