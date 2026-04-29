"""Plaid-sandbox-shape -> ``NormalizedTransaction`` and ``EntityAccount``.

The Next.js importer stores rows whose keys match the raw Plaid payload (see
``lib/services/mappers.ts`` in the repo root). We translate to the internal
models here and – critically – flip the amount sign so that every downstream
transformation can rely on *positive = inflow, negative = outflow*.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional

from .models import (
    AccountMetadata,
    AccountSnapshot,
    AccountType,
    EntityAccount,
    NormalizedTransaction,
)

_PLAID_TO_ACCOUNT_TYPE = {
    "depository": AccountType.DEPOSITORY,
    "checking": AccountType.DEPOSITORY,
    "savings": AccountType.SAVINGS,
    "cd": AccountType.TERM,
    "term": AccountType.TERM,
    "money market": AccountType.SAVINGS,
    "credit": AccountType.CREDIT,
}


def _coerce_date(value: Any) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        # Plaid uses ISO 8601 YYYY-MM-DD
        return datetime.fromisoformat(value.split("T")[0]).date()
    raise TypeError(f"Cannot coerce {value!r} to date")


def _account_type(raw: Optional[str], subtype: Optional[str] = None) -> AccountType:
    if subtype:
        mapped = _PLAID_TO_ACCOUNT_TYPE.get(subtype.lower())
        if mapped:
            return mapped
    if raw:
        mapped = _PLAID_TO_ACCOUNT_TYPE.get(raw.lower())
        if mapped:
            return mapped
    return AccountType.OTHER


def normalize_plaid_transaction(
    raw: Dict[str, Any],
    *,
    currency: str = "USD",
) -> NormalizedTransaction:
    """Flip Plaid's sign convention and pull out the fields we use downstream.

    Plaid treats money *leaving* the account as positive; we treat money
    *arriving* as positive. Everywhere else in the codebase relies on that.
    """

    amount_raw = float(raw["amount"])
    amount = -amount_raw  # flip: outflow (raw positive) -> negative

    pfc = raw.get("personal_finance_category") or raw.get("personalFinanceCategory")
    primary = detailed = None
    if isinstance(pfc, dict):
        primary = pfc.get("primary")
        detailed = pfc.get("detailed")
    elif raw.get("category"):
        cats = raw["category"]
        if isinstance(cats, list) and cats:
            primary = cats[0]
            detailed = cats[-1] if len(cats) > 1 else None

    return NormalizedTransaction(
        id=str(raw.get("transaction_id") or raw.get("transactionId") or raw["id"]),
        account_id=str(raw.get("account_id") or raw.get("accountId")),
        date=_coerce_date(raw.get("date")),
        amount=amount,
        currency=raw.get("iso_currency_code") or raw.get("isoCurrencyCode") or currency,
        category=primary,
        subcategory=detailed,
        vendor=raw.get("merchant_name") or raw.get("merchantName") or raw.get("name"),
        payment_channel=raw.get("payment_channel") or raw.get("paymentChannel"),
        merchant_entity_id=raw.get("merchant_entity_id") or raw.get("merchantEntityId"),
        pending=bool(raw.get("pending", False)),
    )


def normalize_plaid_account(
    raw: Dict[str, Any],
    *,
    metadata: Optional[AccountMetadata] = None,
) -> EntityAccount:
    balances = raw.get("balances") or {}
    balance = raw.get("balance")
    if balance is None:
        balance = balances.get("available")
    if balance is None:
        balance = balances.get("current", 0.0)

    currency = (
        raw.get("iso_currency_code")
        or raw.get("isoCurrencyCode")
        or raw.get("currencyIsoCode")
        or balances.get("iso_currency_code")
        or "USD"
    )

    md = metadata or AccountMetadata(currency=currency)
    if md.currency != currency:
        md = AccountMetadata(
            entity=md.entity,
            currency=currency,
            apy=md.apy,
            target_balance=md.target_balance,
            is_primary=md.is_primary,
        )

    return EntityAccount(
        id=str(raw.get("account_id") or raw.get("accountId") or raw.get("id")),
        name=raw.get("name") or raw.get("official_name") or "Account",
        type=_account_type(raw.get("type"), raw.get("subtype")),
        balance=float(balance or 0.0),
        metadata=md,
    )


def build_snapshots(
    accounts: Iterable[EntityAccount],
    transactions: Iterable[NormalizedTransaction],
) -> List[AccountSnapshot]:
    """Group transactions under their owning account, preserving the order of
    ``accounts``."""

    by_account: Dict[str, List[NormalizedTransaction]] = {a.id: [] for a in accounts}
    for t in transactions:
        by_account.setdefault(t.account_id, []).append(t)

    out: List[AccountSnapshot] = []
    for a in accounts:
        txs = sorted(by_account.get(a.id, []), key=lambda x: x.date)
        out.append(AccountSnapshot(account=a, transactions=txs))
    return out
