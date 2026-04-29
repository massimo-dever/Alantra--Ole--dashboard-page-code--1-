"""Alantra Python backend package.

Centralises every financial data transformation that used to live in the
Next.js frontend. Pages in the React app call the thin FastAPI layer in
``alantra_backend.app`` and render the pre-computed payloads returned here.
"""

from .models import (
    AccountSnapshot,
    AccountMetadata,
    AccountType,
    EntityAccount,
    NormalizedTransaction,
    RecurringPayment,
)

__all__ = [
    "AccountSnapshot",
    "AccountMetadata",
    "AccountType",
    "EntityAccount",
    "NormalizedTransaction",
    "RecurringPayment",
]
