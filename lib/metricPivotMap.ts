export const metricToPivot: Record<string, string | undefined> = {
  total_income: "category",
  total_expenses: "category",
  avg_monthly_income: "category",
  avg_monthly_expenses: "category",

  total_vendors: "vendor",
  avg_spend_per_vendor: "vendor",
  top_vendor_spend: "vendor",
  top_vendor_concentration_pct: "vendor",

  total_customers: "customer",
  avg_revenue_per_customer: "customer",
  top_customer_revenue: "customer",
  top_customer_concentration_pct: "customer",

  total_accounts: "cashFlow",
  asset_accounts: "cashFlow",
  liability_accounts: "cashFlow",
};
