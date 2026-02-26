import { v4 as uuidv4 } from "uuid";
import {
  CanonicalAccount,
  CanonicalTransaction,
  CanonicalCustomer,
  CanonicalVendor,
} from "@/types/dashboard";

const ACCOUNT_TYPE_MAP: Record<string, string> = {
  "depository|checking": "asset",
  "depository|savings": "asset",
  "depository|money market": "asset",
  "credit|credit card": "liability",
  "loan|line of credit": "liability",
  "loan|mortgage": "liability",
  "investment|401k": "asset",
  "investment|brokerage": "asset",
};

const VENDOR_TYPE_MAP: Record<string, string> = {
  "18030000": "software",
  "18045000": "facilities",
  "18020000": "software",
  "22001000": "travel",
  "22003000": "travel",
  "22006000": "travel",
  "19033000": "supplies",
  "18050000": "shipping",
  "18040000": "utilities",
  "18068000": "utilities",
  "18024000": "contractor",
  "18018000": "contractor",
  "13005043": "meals",
  "13005000": "meals",
};

function getCounterpartyName(txn: any): string | null {
  const counterparties = txn.counterparties || [];
  if (counterparties.length > 0) {
    return counterparties[0].name || null;
  }
  return txn.merchant_name || null;
}

export function transformPlaidData(plaidResponse: any): {
  transactions: CanonicalTransaction[];
  accounts: CanonicalAccount[];
  customers: CanonicalCustomer[];
  vendors: CanonicalVendor[];
} {
  const accountIdMap: Record<string, string> = {};
  const customerIdMap: Record<string, string> = {};
  const vendorIdMap: Record<string, string> = {};

  // 1. Transform accounts
  const accounts: CanonicalAccount[] = (plaidResponse.accounts || []).map(
    (acc: any) => {
      const canonicalId = uuidv4();
      const plaidId = acc.account_id;
      accountIdMap[plaidId] = canonicalId;

      const accType =
        ACCOUNT_TYPE_MAP[`${acc.type}|${acc.subtype}`] || "asset";

      return {
        id: canonicalId,
        name: acc.official_name || acc.name,
        code: null,
        type: accType,
        source_system: "Plaid_API",
        source_id: plaidId,
      };
    }
  );

  // 2. Extract counterparties
  const customersMap: Record<string, CanonicalCustomer> = {};
  const vendorsMap: Record<string, CanonicalVendor> = {};

  for (const txn of plaidResponse.transactions || []) {
    const name = getCounterpartyName(txn);
    if (!name) continue;

    const amount = txn.amount || 0;
    const isIncome = amount < 0;

    if (isIncome && !customersMap[name]) {
      const canonicalId = uuidv4();
      customerIdMap[name] = canonicalId;
      customersMap[name] = {
        id: canonicalId,
        name,
        region: null,
        status: null,
        source_system: "Plaid_API",
      };
    } else if (!isIncome && !vendorsMap[name]) {
      const canonicalId = uuidv4();
      vendorIdMap[name] = canonicalId;

      const categoryId = String(txn.category_id || "");
      const vendorType = VENDOR_TYPE_MAP[categoryId] || "other";

      vendorsMap[name] = {
        id: canonicalId,
        name,
        type: vendorType,
        source_system: "Plaid_API",
      };
    }
  }

  const customers = Object.values(customersMap);
  const vendors = Object.values(vendorsMap);

  // 3. Transform transactions
  const transactions: CanonicalTransaction[] = (
    plaidResponse.transactions || []
  ).map((txn: any) => {
    const amount = txn.amount || 0;
    const isIncome = amount < 0;
    const counterpartyName = getCounterpartyName(txn);

    const counterpartyId = isIncome
      ? customerIdMap[counterpartyName || ""]
      : vendorIdMap[counterpartyName || ""];

    return {
      id: uuidv4(),
      date: txn.date,
      amount: Math.abs(amount),
      currency: txn.iso_currency_code || "USD",
      account_id: accountIdMap[txn.account_id] || null,
      counterparty_id: counterpartyId || null,
      raw_description: txn.name,
      source_system: "Plaid_API",
      mapped_category_id: null,
      source_id: txn.transaction_id,
      is_pending: txn.pending || false,
      counterparty_type: isIncome ? "customer" : "vendor",
    };
  });

  return { transactions, accounts, customers, vendors };
}
