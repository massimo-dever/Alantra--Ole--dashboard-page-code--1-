"""Domain models shared across transformations.

The Plaid importer in the Next.js app writes rows into Supabase that closely
follow the shape of ``prisma/schema.prisma`` at the repo root. These pydantic
models wrap those rows with a Python-friendly surface plus a handful of
synthetic fields (entity mapping, APY, target balance) that every frontend
screen wants but Plaid itself does not provide.
"""

from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AccountType(str, Enum):
    DEPOSITORY = "depository"  # checking
    SAVINGS = "savings"
    TERM = "term"  # CD / treasury
    CREDIT = "credit"
    OTHER = "other"


class AccountMetadata(BaseModel):
    """Metadata that enriches a raw Plaid account.

    ``entity`` is the Alantra business entity the account rolls up into (for
    example "Alantra UK"). ``apy`` / ``target_balance`` are the Alantra-managed
    fields that drive treasury alerts. Defaults mirror what the frontend used
    to hard-code.
    """

    model_config = ConfigDict(frozen=True)

    entity: str = "Alantra"
    currency: str = "USD"
    apy: float = 0.0
    target_balance: Optional[float] = None
    is_primary: bool = False


class EntityAccount(BaseModel):
    """One bank account – the atomic unit every dashboard iterates over."""

    id: str
    name: str
    type: AccountType
    balance: float
    metadata: AccountMetadata = Field(default_factory=AccountMetadata)

    @property
    def entity(self) -> str:
        return self.metadata.entity

    @property
    def apy(self) -> float:
        return self.metadata.apy


class NormalizedTransaction(BaseModel):
    """Row-level transaction with the sign convention the rest of the backend
    assumes: *positive = inflow, negative = outflow*.

    Plaid itself uses the opposite convention (positive = money leaving the
    account), so :mod:`alantra_backend.normalize` is the one spot in the
    system that flips it. Every transformation downstream relies on this
    invariant.
    """

    model_config = ConfigDict(frozen=True)

    id: str
    account_id: str
    date: date
    amount: float  # positive = inflow, negative = outflow (post-normalization)
    currency: str = "USD"
    category: Optional[str] = None
    subcategory: Optional[str] = None
    vendor: Optional[str] = None
    payment_channel: Optional[str] = None  # e.g. "online" / "in store" / "other"
    merchant_entity_id: Optional[str] = None
    pending: bool = False


class AccountSnapshot(BaseModel):
    """Convenience bundle passed into the transformation functions."""

    account: EntityAccount
    transactions: List[NormalizedTransaction]


class RecurringPayment(BaseModel):
    """A recurring outflow detected from the transaction stream.

    The list of columns matches what the Recurring Outflow table on the web
    frontend wants to render.
    """

    vendor: str
    category: str
    cadence: str  # "Weekly" | "Monthly" | "Annually"
    last_charge: float
    last_charge_date: date
    next_due_in_days: int
    status: str  # "Paid" | "Overdue" | "Cancelled"
    monthly_equivalent: float


class ApprovalRequest(BaseModel):
    """A scheduled/pending outflow awaiting approval.

    We derive this from Plaid's ``pending=true`` flag on outflows. In a real
    deployment this would also pull from the internal approvals table.
    """

    id: str
    account_id: str
    amount: float
    vendor: Optional[str]
    date: date
