"""Plaid sandbox fixture.

The Plaid Sandbox environment deterministically generates ``ins_109508`` test
accounts with a recurring set of transactions (Uber, United Airlines, McDonald's,
Starbucks, ACH payroll credits, and a monthly ACH rent debit). We recreate that
same shape here for three distinct Alantra entities so the transformation
functions exercise multi-account / multi-currency / multi-entity paths.

The data is anchored at a fixed ``ANCHOR_DATE`` so test output stays stable; the
``shift_to_today`` helper lets consumers rebase onto the current clock for
realistic runway / calendar calculations.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Dict, List, Tuple

from ..models import AccountMetadata, AccountSnapshot, AccountType, EntityAccount
from ..normalize import (
    build_snapshots,
    normalize_plaid_account,
    normalize_plaid_transaction,
)

ANCHOR_DATE = date(2025, 10, 1)


# ---------------------------------------------------------------------------
# Sandbox accounts (three Alantra entities)
# ---------------------------------------------------------------------------

_ACCOUNT_DEFS: List[Tuple[Dict[str, Any], AccountMetadata]] = [
    (
        {
            "account_id": "plaid_us_checking",
            "name": "Alantra US - Operating",
            "type": "depository",
            "subtype": "checking",
            "iso_currency_code": "USD",
            "balances": {"available": 420_000.0, "current": 420_000.0},
        },
        AccountMetadata(entity="Alantra US", currency="USD", apy=0.002, target_balance=250_000.0, is_primary=True),
    ),
    (
        {
            "account_id": "plaid_us_savings",
            "name": "Alantra US - Treasury Savings",
            "type": "depository",
            "subtype": "savings",
            "iso_currency_code": "USD",
            "balances": {"available": 1_800_000.0, "current": 1_800_000.0},
        },
        AccountMetadata(entity="Alantra US", currency="USD", apy=0.048, target_balance=1_000_000.0),
    ),
    (
        {
            "account_id": "plaid_uk_checking",
            "name": "Alantra UK - Operating",
            "type": "depository",
            "subtype": "checking",
            "iso_currency_code": "USD",
            "balances": {"available": 90_000.0, "current": 90_000.0},
        },
        AccountMetadata(entity="Alantra UK", currency="USD", apy=0.003, target_balance=120_000.0),
    ),
    (
        {
            "account_id": "plaid_eu_checking",
            "name": "Alantra EU - Operating",
            "type": "depository",
            "subtype": "checking",
            "iso_currency_code": "USD",
            "balances": {"available": 310_000.0, "current": 310_000.0},
        },
        AccountMetadata(entity="Alantra EU", currency="USD", apy=0.004, target_balance=250_000.0),
    ),
]


# ---------------------------------------------------------------------------
# Sandbox transactions
# ---------------------------------------------------------------------------
# Plaid sandbox positive amounts = money leaving. Negative = money arriving.
# We mirror that convention exactly; :mod:`normalize` flips the sign.

def _sandbox_transactions(anchor: date) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    # Build a rich 12-month history so monthly/MoM calculations have real data.
    for month_offset in range(12, 0, -1):
        # Approximate month anchor; offset fortnightly payroll by 14-day steps.
        base = anchor - timedelta(days=30 * month_offset)

        # --- Alantra US revenue (ACH credits = negative in Plaid's sign) ----
        for d_off, amount in ((2, -85_000.0), (17, -75_000.0)):
            d = base + timedelta(days=d_off)
            rows.append(
                _tx(
                    "plaid_us_savings",
                    d,
                    amount,
                    vendor="Stripe Payout",
                    category="Transfer In",
                    detailed="INCOME_WAGES",
                    payment_channel="online",
                )
            )

        # --- US operating payroll debits (fortnightly, positive = leaving) --
        for d_off in (3, 17):
            rows.append(
                _tx(
                    "plaid_us_checking",
                    base + timedelta(days=d_off),
                    90_000.0,
                    vendor="Gusto Payroll",
                    category="Payroll",
                    detailed="GENERAL_SERVICES_HUMAN_RESOURCES",
                    payment_channel="online",
                )
            )

        # --- Monthly rent (ACH) -------------------------------------------
        rows.append(
            _tx(
                "plaid_us_checking",
                base + timedelta(days=5),
                12_500.0,
                vendor="WeWork",
                category="Rent",
                detailed="RENT_AND_UTILITIES_RENT",
                payment_channel="online",
            )
        )

        # --- Recurring SaaS (Slack, AWS, Google, etc.) --------------------
        for d_off, vendor, amount, pfc in (
            (7, "Amazon Web Services", 8_400.0, "GENERAL_SERVICES_OTHER_GENERAL_SERVICES"),
            (8, "Slack", 1_200.0, "GENERAL_SERVICES_OTHER_GENERAL_SERVICES"),
            (10, "Google Workspace", 950.0, "GENERAL_SERVICES_OTHER_GENERAL_SERVICES"),
            (12, "Notion", 400.0, "GENERAL_SERVICES_OTHER_GENERAL_SERVICES"),
            (15, "Datadog", 2_200.0, "GENERAL_SERVICES_OTHER_GENERAL_SERVICES"),
        ):
            rows.append(
                _tx(
                    "plaid_us_checking",
                    base + timedelta(days=d_off),
                    amount,
                    vendor=vendor,
                    category="Software",
                    detailed=pfc,
                    payment_channel="online",
                )
            )

        # --- Card spend on the US account (small, many) -------------------
        for d_off, vendor, amount, channel in (
            (4, "Uber", 58.0, "online"),
            (9, "United Airlines", 720.0, "online"),
            (14, "McDonald's", 12.0, "in store"),
            (20, "Starbucks", 5.4, "in store"),
            (22, "DoorDash", 38.0, "online"),
        ):
            rows.append(
                _tx(
                    "plaid_us_checking",
                    base + timedelta(days=d_off),
                    amount,
                    vendor=vendor,
                    category="Travel" if vendor in {"Uber", "United Airlines"} else "Food and Drink",
                    detailed="TRANSPORTATION_TAXIS_AND_RIDE_SHARES" if vendor == "Uber" else "FOOD_AND_DRINK_RESTAURANTS",
                    payment_channel=channel,
                )
            )

        # --- UK entity: salary credits + opex (burning more than revenue) --
        rows.append(
            _tx(
                "plaid_uk_checking",
                base + timedelta(days=1),
                -22_000.0,
                vendor="Revenue Transfer",
                category="Transfer In",
                detailed="INCOME_OTHER_INCOME",
                payment_channel="online",
            )
        )
        rows.append(
            _tx(
                "plaid_uk_checking",
                base + timedelta(days=4),
                36_000.0,
                vendor="Deel Payroll UK",
                category="Payroll",
                detailed="GENERAL_SERVICES_HUMAN_RESOURCES",
                payment_channel="online",
            )
        )
        rows.append(
            _tx(
                "plaid_uk_checking",
                base + timedelta(days=11),
                1_100.0,
                vendor="Mindspace London",
                category="Rent",
                detailed="RENT_AND_UTILITIES_RENT",
                payment_channel="online",
            )
        )

        # --- EU entity: break-even-ish ------------------------------------
        rows.append(
            _tx(
                "plaid_eu_checking",
                base + timedelta(days=2),
                -40_000.0,
                vendor="Intercompany Revenue",
                category="Transfer In",
                detailed="INCOME_OTHER_INCOME",
                payment_channel="online",
            )
        )
        rows.append(
            _tx(
                "plaid_eu_checking",
                base + timedelta(days=6),
                28_000.0,
                vendor="Remote Payroll EU",
                category="Payroll",
                detailed="GENERAL_SERVICES_HUMAN_RESOURCES",
                payment_channel="online",
            )
        )
        rows.append(
            _tx(
                "plaid_eu_checking",
                base + timedelta(days=18),
                2_400.0,
                vendor="Mindspace Berlin",
                category="Rent",
                detailed="RENT_AND_UTILITIES_RENT",
                payment_channel="online",
            )
        )

    # --- Pending outflow on the US operating account (Plaid's `pending=true`)
    rows.append(
        _tx(
            "plaid_us_checking",
            anchor - timedelta(days=1),
            24_000.0,
            vendor="Vendor Wire (pending approval)",
            category="Payroll",
            detailed="GENERAL_SERVICES_HUMAN_RESOURCES",
            payment_channel="online",
            pending=True,
        )
    )

    return rows


def _tx(
    account_id: str,
    d: date,
    amount: float,
    *,
    vendor: str,
    category: str,
    detailed: str,
    payment_channel: str,
    pending: bool = False,
) -> Dict[str, Any]:
    return {
        "transaction_id": f"{account_id}_{d.isoformat()}_{vendor}".replace(" ", "_"),
        "account_id": account_id,
        "date": d.isoformat(),
        "amount": amount,
        "iso_currency_code": "USD",
        "personal_finance_category": {"primary": category.upper().replace(" ", "_"), "detailed": detailed},
        "category": [category],
        "merchant_name": vendor,
        "name": vendor,
        "payment_channel": payment_channel,
        "pending": pending,
    }


# ---------------------------------------------------------------------------
# Public loader
# ---------------------------------------------------------------------------

@dataclass
class SandboxData:
    accounts: List[EntityAccount]
    snapshots: List[AccountSnapshot]
    anchor: date

    @property
    def transactions(self):
        out = []
        for s in self.snapshots:
            out.extend(s.transactions)
        return out


def load_sandbox_snapshot(anchor: date | None = None) -> SandboxData:
    """Return a fresh sandbox dataset anchored at ``anchor`` (default: fixed).

    Callers that want the data to be "today"-relative should pass
    ``date.today()`` as the anchor; tests pass the fixed ``ANCHOR_DATE`` so
    their assertions stay stable.
    """

    anchor = anchor or ANCHOR_DATE

    accounts = [normalize_plaid_account(raw, metadata=md) for raw, md in _ACCOUNT_DEFS]
    raw_txs = _sandbox_transactions(anchor)
    txs = [normalize_plaid_transaction(t) for t in raw_txs]
    snapshots = build_snapshots(accounts, txs)
    return SandboxData(accounts=accounts, snapshots=snapshots, anchor=anchor)
