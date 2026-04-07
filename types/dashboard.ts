// Canonical schema types
export interface CanonicalAccount {
  id: string;
  name: string;
  code: string | null;
  type: string;
  source_system: string;
  source_id: string;
}

export interface CanonicalTransaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  account_id: string | null;
  counterparty_id: string | null;
  raw_description: string;
  source_system: string;
  mapped_category_id: string | null;
  source_id: string;
  is_pending: boolean;
  counterparty_type: "customer" | "vendor";
}

export interface CanonicalCustomer {
  id: string;
  name: string;
  region: string | null;
  status: string | null;
  source_system: string;
}

export interface CanonicalVendor {
  id: string;
  name: string;
  type: string;
  source_system: string;
}

export interface SummaryMetric {
  metric: string;
  value: string | number;
  description: string;
}

export interface PivotTable {
  headers: string[];
  rows: { label: string; values: number[] }[];
}

export interface DashboardData {
  summaryStats: SummaryMetric[];
  pivotTables: {
    category: PivotTable;
    vendor: PivotTable;
    customer: PivotTable;
    cashFlow: PivotTable;
  };
}
