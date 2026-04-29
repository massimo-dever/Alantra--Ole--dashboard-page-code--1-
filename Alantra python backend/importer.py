"""Bridge between Supabase rows (written by the Next.js Plaid importer) and
:class:`AccountSnapshot` instances that every transformation consumes.

The live frontend pushes Plaid/Stripe rows into the following Supabase tables
(see ``prisma/schema.prisma``):

* ``accounts`` – one row per bank account (snake_cased Prisma model).
* ``transactions`` – normalised transactions (Plaid + Stripe).

Both tables share their column names with the Prisma model (e.g. ``accountId``,
``isRemoved``) because PostgREST is case-sensitive. This importer tolerates
*either* ``snake_case`` or ``camelCase`` keys so the same code works when we
migrate the importer to snake_case later on.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .models import AccountMetadata, AccountSnapshot, AccountType, EntityAccount
from .normalize import (
    build_snapshots,
    normalize_plaid_account,
    normalize_plaid_transaction,
)
from .supabase_client import FakeSupabaseReader, SupabaseReader


def _pick(d: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return default


def _account_from_supabase(row: Dict[str, Any], metadata_overrides: Optional[Dict[str, AccountMetadata]] = None) -> EntityAccount:
    account_id = str(_pick(row, "account_id", "accountId", "id"))
    name = _pick(row, "name", default="Account")
    raw_type = _pick(row, "type", default="depository")
    balance = _pick(row, "balance", default=0.0)
    currency = _pick(row, "currency_iso_code", "currencyIsoCode", "iso_currency_code", default="USD")

    md = (metadata_overrides or {}).get(account_id) or AccountMetadata(currency=currency)
    if md.currency != currency:
        md = AccountMetadata(
            entity=md.entity,
            currency=currency,
            apy=md.apy,
            target_balance=md.target_balance,
            is_primary=md.is_primary,
        )

    # Reuse the Plaid normaliser since the row shape is already close.
    return normalize_plaid_account(
        {
            "account_id": account_id,
            "name": name,
            "type": raw_type,
            "subtype": _pick(row, "subtype"),
            "iso_currency_code": currency,
            "balance": balance,
        },
        metadata=md,
    )


def _transaction_from_supabase(row: Dict[str, Any]):
    return normalize_plaid_transaction(
        {
            "transaction_id": _pick(row, "transaction_id", "transactionId", "id"),
            "account_id": _pick(row, "account_id", "accountId"),
            "date": _pick(row, "date"),
            "amount": _pick(row, "amount", default=0.0),
            "iso_currency_code": _pick(row, "iso_currency_code", "isoCurrencyCode", default="USD"),
            "personal_finance_category": _pick(row, "personal_finance_category", "personalFinanceCategory"),
            "category": _pick(row, "category"),
            "merchant_name": _pick(row, "merchant_name", "merchantName", "vendor"),
            "name": _pick(row, "name", "original_description", "originalDescription"),
            "payment_channel": _pick(row, "payment_channel", "paymentChannel"),
            "merchant_entity_id": _pick(row, "merchant_entity_id", "merchantEntityId"),
            "pending": _pick(row, "pending", default=False),
        }
    )


def load_snapshots_from_supabase(
    reader: SupabaseReader,
    *,
    user_id: Optional[str] = None,
    account_metadata: Optional[Dict[str, AccountMetadata]] = None,
    account_table: str = "accounts",
    transaction_table: str = "transactions",
) -> List[AccountSnapshot]:
    """Pull accounts + transactions from Supabase and return snapshots.

    ``account_metadata`` maps an account id to the Alantra-managed metadata
    (entity, APY, target balance). In production these come from a separate
    ``account_config`` table; the importer stays neutral on where they live.
    """

    account_filters: Dict[str, Any] = {}
    tx_filters: Dict[str, Any] = {}
    if user_id:
        account_filters["userId"] = user_id
        tx_filters["userId"] = user_id

    raw_accounts = reader.select(account_table, filters=account_filters or None)
    raw_transactions = reader.select(transaction_table, filters=tx_filters or None)

    # Some deployments store the Plaid-original rows in ``plaid_transactions``
    # with an ``isRemoved`` flag. Tolerate both.
    raw_transactions = [r for r in raw_transactions if not r.get("is_removed") and not r.get("isRemoved")]

    accounts = [_account_from_supabase(r, account_metadata) for r in raw_accounts]
    transactions = [_transaction_from_supabase(r) for r in raw_transactions]
    return build_snapshots(accounts, transactions)


def load_snapshots_from_fixture() -> List[AccountSnapshot]:
    """Shortcut for the unit tests / fallback demo mode."""

    from .fixtures import load_sandbox_snapshot

    return load_sandbox_snapshot().snapshots
