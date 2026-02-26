import {
  CanonicalTransaction,
  CanonicalAccount,
  CanonicalCustomer,
  CanonicalVendor,
  SummaryMetric,
  PivotTable,
  DashboardData,
} from "@/types/dashboard";

function getYearMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Group helper
function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

// Build a pivot table from transactions
function buildPivot(
  transactions: CanonicalTransaction[],
  labelMap: Record<string, string>, // counterparty_id -> display name
  valueField: "amount" = "amount"
): PivotTable {
  const months = [...new Set(transactions.map((t) => getYearMonth(t.date)))].sort();
  const byLabel: Record<string, Record<string, number>> = {};

  for (const txn of transactions) {
    const label = labelMap[txn.counterparty_id || ""] || "Unknown";
    if (!byLabel[label]) byLabel[label] = {};
    const month = getYearMonth(txn.date);
    byLabel[label][month] = (byLabel[label][month] || 0) + txn[valueField];
  }

  const headers = ["Name", ...months];
  const rows = Object.entries(byLabel).map(([label, monthData]) => ({
    label,
    values: months.map((m) => round2(monthData[m] || 0)),
  }));

  return { headers, rows };
}

// 1b. Category pivot (vendor_type as category)
function buildCategoryPivot(
  transactions: CanonicalTransaction[],
  vendors: CanonicalVendor[]
): PivotTable {
  const vendorTypeMap: Record<string, string> = {};
  for (const v of vendors) vendorTypeMap[v.id] = v.type;

  const months = [...new Set(transactions.map((t) => getYearMonth(t.date)))].sort();
  const byCategory: Record<string, Record<string, number>> = {};

  for (const txn of transactions) {
    let category: string;
    if (txn.counterparty_type === "vendor") {
      category = vendorTypeMap[txn.counterparty_id || ""] || "other";
    } else {
      category = "income";
    }
    if (!byCategory[category]) byCategory[category] = {};
    const month = getYearMonth(txn.date);
    byCategory[category][month] = (byCategory[category][month] || 0) + txn.amount;
  }

  const headers = ["Category", ...months];
  const rows = Object.entries(byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, monthData]) => ({
      label,
      values: months.map((m) => round2(monthData[m] || 0)),
    }));

  return { headers, rows };
}

// 6. Summary statistics
function generateSummaryStats(
  transactions: CanonicalTransaction[],
  accounts: CanonicalAccount[],
  customers: CanonicalCustomer[],
  vendors: CanonicalVendor[]
): SummaryMetric[] {
  const incomeTxns = transactions.filter((t) => t.counterparty_type === "customer");
  const expenseTxns = transactions.filter((t) => t.counterparty_type === "vendor");

  const totalIncome = incomeTxns.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenseTxns.reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const dates = transactions.map((t) => new Date(t.date).getTime());
  const dateMin = new Date(Math.min(...dates));
  const dateMax = new Date(Math.max(...dates));
  const daysInRange = Math.round((dateMax.getTime() - dateMin.getTime()) / 86400000) + 1;
  const monthsInRange = new Set(transactions.map((t) => getYearMonth(t.date))).size;

  const avgMonthlyIncome = totalIncome / monthsInRange;
  const avgMonthlyExpenses = totalExpenses / monthsInRange;
  const avgTransactionSize = transactions.reduce((s, t) => s + t.amount, 0) / transactions.length;

  const totalCustomers = customers.length;
  const avgRevenuePerCustomer = totalCustomers > 0 ? totalIncome / totalCustomers : 0;

  // Top customer revenue
  const customerRevenue: Record<string, number> = {};
  for (const t of incomeTxns) {
    customerRevenue[t.counterparty_id || ""] =
      (customerRevenue[t.counterparty_id || ""] || 0) + t.amount;
  }
  const topCustomerRevenue = Math.max(...Object.values(customerRevenue), 0);
  const topCustomerPct = totalIncome > 0 ? (topCustomerRevenue / totalIncome) * 100 : 0;

  const totalVendors = vendors.length;
  const avgSpendPerVendor = totalVendors > 0 ? totalExpenses / totalVendors : 0;

  // Top vendor spend
  const vendorSpend: Record<string, number> = {};
  for (const t of expenseTxns) {
    vendorSpend[t.counterparty_id || ""] =
      (vendorSpend[t.counterparty_id || ""] || 0) + t.amount;
  }
  const topVendorSpend = Math.max(...Object.values(vendorSpend), 0);
  const topVendorPct = totalExpenses > 0 ? (topVendorSpend / totalExpenses) * 100 : 0;

  const pendingCount = transactions.filter((t) => t.is_pending).length;

  return [
    { metric: "total_income", value: round2(totalIncome), description: "Total income from all customers" },
    { metric: "total_expenses", value: round2(totalExpenses), description: "Total expenses to all vendors" },
    { metric: "net_profit", value: round2(netProfit), description: "Net profit (income - expenses)" },
    { metric: "profit_margin_pct", value: round2(profitMargin), description: "Profit margin percentage" },
    { metric: "date_start", value: dateMin.toISOString().split("T")[0], description: "First transaction date" },
    { metric: "date_end", value: dateMax.toISOString().split("T")[0], description: "Last transaction date" },
    { metric: "days_in_range", value: daysInRange, description: "Number of days in date range" },
    { metric: "months_in_range", value: monthsInRange, description: "Number of months with transactions" },
    { metric: "avg_monthly_income", value: round2(avgMonthlyIncome), description: "Average monthly income" },
    { metric: "avg_monthly_expenses", value: round2(avgMonthlyExpenses), description: "Average monthly expenses" },
    { metric: "avg_transaction_size", value: round2(avgTransactionSize), description: "Average transaction amount" },
    { metric: "total_customers", value: totalCustomers, description: "Number of unique customers" },
    { metric: "avg_revenue_per_customer", value: round2(avgRevenuePerCustomer), description: "Average revenue per customer" },
    { metric: "top_customer_revenue", value: round2(topCustomerRevenue), description: "Revenue from top customer" },
    { metric: "top_customer_concentration_pct", value: round2(topCustomerPct), description: "Top customer % of total revenue" },
    { metric: "total_vendors", value: totalVendors, description: "Number of unique vendors" },
    { metric: "avg_spend_per_vendor", value: round2(avgSpendPerVendor), description: "Average spend per vendor" },
    { metric: "top_vendor_spend", value: round2(topVendorSpend), description: "Spend with top vendor" },
    { metric: "top_vendor_concentration_pct", value: round2(topVendorPct), description: "Top vendor % of total expenses" },
    { metric: "total_transactions", value: transactions.length, description: "Total number of transactions" },
    { metric: "income_transactions", value: incomeTxns.length, description: "Number of income transactions" },
    { metric: "expense_transactions", value: expenseTxns.length, description: "Number of expense transactions" },
    { metric: "pending_transactions", value: pendingCount, description: "Number of pending transactions" },
    { metric: "total_accounts", value: accounts.length, description: "Total number of accounts" },
    { metric: "asset_accounts", value: accounts.filter((a) => a.type === "asset").length, description: "Number of asset accounts" },
    { metric: "liability_accounts", value: accounts.filter((a) => a.type === "liability").length, description: "Number of liability accounts" },
  ];
}

// Main: run full pipeline and return dashboard data
export function generateDashboardData(
  transactions: CanonicalTransaction[],
  accounts: CanonicalAccount[],
  customers: CanonicalCustomer[],
  vendors: CanonicalVendor[]
): DashboardData {
  const summaryStats = generateSummaryStats(transactions, accounts, customers, vendors);

  // Build ID -> name maps
  const vendorNameMap: Record<string, string> = {};
  for (const v of vendors) vendorNameMap[v.id] = v.name;

  const customerNameMap: Record<string, string> = {};
  for (const c of customers) customerNameMap[c.id] = c.name;

  const accountNameMap: Record<string, string> = {};
  for (const a of accounts) accountNameMap[a.id] = a.name;

  // Pivot tables
  const incomeTxns = transactions.filter((t) => t.counterparty_type === "customer");
  const expenseTxns = transactions.filter((t) => t.counterparty_type === "vendor");

  const categoryPivot = buildCategoryPivot(transactions, vendors);
  const vendorPivot = buildPivot(expenseTxns, vendorNameMap);
  const customerPivot = buildPivot(incomeTxns, customerNameMap);
  const cashFlowPivot = buildCashFlowPivot(transactions, accountNameMap);

  return {
    summaryStats,
    pivotTables: {
      category: categoryPivot,
      vendor: vendorPivot,
      customer: customerPivot,
      cashFlow: cashFlowPivot,
    },
  };
}

// 4c. Cash flow pivot (net per account per month)
function buildCashFlowPivot(
  transactions: CanonicalTransaction[],
  accountNameMap: Record<string, string>
): PivotTable {
  const months = [...new Set(transactions.map((t) => getYearMonth(t.date)))].sort();
  const byAccount: Record<string, Record<string, number>> = {};

  for (const txn of transactions) {
    const label = accountNameMap[txn.account_id || ""] || "Unknown";
    if (!byAccount[label]) byAccount[label] = {};
    const month = getYearMonth(txn.date);
    const signed = txn.counterparty_type === "customer" ? txn.amount : -txn.amount;
    byAccount[label][month] = (byAccount[label][month] || 0) + signed;
  }

  const headers = ["Account", ...months];
  const rows = Object.entries(byAccount).map(([label, monthData]) => ({
    label,
    values: months.map((m) => round2(monthData[m] || 0)),
  }));

  return { headers, rows };
}
