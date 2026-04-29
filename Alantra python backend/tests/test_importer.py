"""Exercises the Supabase importer against an in-memory fake whose rows match
exactly what the Next.js frontend's Plaid importer writes. This is the
compatibility guarantee the task cares about – if these tests pass, pointing
the same reader at live Supabase will work too."""

from alantra_backend.importer import load_snapshots_from_supabase
from alantra_backend.models import AccountMetadata
from alantra_backend.supabase_client import FakeSupabaseReader


def test_importer_reads_plaid_importer_shape():
    # Mimic what `lib/services/plaid-service.ts` / `mappers.ts` writes.
    accounts_rows = [
        {
            "id": "plaid_us_checking",
            "userId": "u1",
            "name": "Alantra US - Operating",
            "type": "depository",
            "currencyIsoCode": "USD",
            "balance": 420_000.0,
        },
    ]
    transactions_rows = [
        {
            "transactionId": "tx1",
            "userId": "u1",
            "accountId": "plaid_us_checking",
            "date": "2025-09-03",
            "amount": 110_000,  # Plaid sign: positive = leaving
            "merchantName": "Gusto Payroll",
            "paymentChannel": "online",
            "personalFinanceCategory": {"primary": "PAYROLL", "detailed": "GENERAL_SERVICES_HUMAN_RESOURCES"},
            "pending": False,
            "isRemoved": False,
        },
        {
            "transactionId": "tx2",
            "userId": "u1",
            "accountId": "plaid_us_checking",
            "date": "2025-09-02",
            "amount": -85_000,  # Plaid sign: negative = arriving
            "merchantName": "Stripe Payout",
            "paymentChannel": "online",
            "personalFinanceCategory": {"primary": "INCOME_WAGES", "detailed": "INCOME_WAGES"},
            "pending": False,
            "isRemoved": False,
        },
        {
            "transactionId": "tx_removed",
            "userId": "u1",
            "accountId": "plaid_us_checking",
            "date": "2025-09-04",
            "amount": 999,
            "merchantName": "should be filtered",
            "paymentChannel": "online",
            "pending": False,
            "isRemoved": True,  # must be excluded
        },
    ]

    reader = FakeSupabaseReader({
        "accounts": accounts_rows,
        "transactions": transactions_rows,
    })
    snapshots = load_snapshots_from_supabase(
        reader,
        user_id="u1",
        account_metadata={
            "plaid_us_checking": AccountMetadata(entity="Alantra US", apy=0.002, target_balance=250_000),
        },
    )

    assert len(snapshots) == 1
    snap = snapshots[0]
    assert snap.account.entity == "Alantra US"
    assert snap.account.balance == 420_000.0
    # Sign normalization flipped both rows.
    kinds = {t.amount > 0: t.vendor for t in snap.transactions}
    assert kinds[True] == "Stripe Payout"
    assert kinds[False] == "Gusto Payroll"
    # Removed row got filtered out.
    assert all(t.id != "tx_removed" for t in snap.transactions)
