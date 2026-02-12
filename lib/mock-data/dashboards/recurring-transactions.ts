export function getRecurringTransactionsData() {
  return {
    kpis: {
      totalMonthlyRecurring: 84100,
      salariesTotal: 58750,
      subscriptionsTotal: 31600,
      otherTotal: 25500,
      changeVsPrior: 3.2,
      upcomingRenewals: 3,
    },
    salariesData: [
      { employee: "John Doe", department: "Engineering", base: 150000, bonus: 20000, benefits: 25000, total: 195000 },
      { employee: "Jane Smith", department: "Product", base: 140000, bonus: 15000, benefits: 23000, total: 178000 },
      { employee: "Bob Johnson", department: "Marketing", base: 120000, bonus: 10000, benefits: 20000, total: 150000 },
      { employee: "Alice Williams", department: "Sales", base: 130000, bonus: 30000, benefits: 22000, total: 182000 },
    ],
    subscriptionsData: [
      { vendor: "AWS", category: "Cloud Infrastructure", perUser: 0, monthly: 8500, renewalDate: "2025-01-15" },
      { vendor: "Slack", category: "Communication", perUser: 8, monthly: 4500, renewalDate: "2025-02-01" },
      { vendor: "GitHub", category: "Development Tools", perUser: 4, monthly: 1200, renewalDate: "2025-01-20" },
      { vendor: "Figma", category: "Design Tools", perUser: 12, monthly: 2400, renewalDate: "2025-02-15" },
      { vendor: "Salesforce", category: "CRM", perUser: 150, monthly: 15000, renewalDate: "2025-03-01" },
    ],
    otherRecurring: [
      { item: "Office Rent", category: "Office", amount: 15000, frequency: "Monthly" },
      { item: "Utilities", category: "Office", amount: 2000, frequency: "Monthly" },
      { item: "Insurance", category: "Insurance", amount: 3500, frequency: "Monthly" },
      { item: "Legal Services", category: "Professional Services", amount: 5000, frequency: "Monthly" },
    ],
    costBreakdown: [
      { name: "Salaries", value: 58750, color: "var(--color-chart-1)" },
      { name: "Subscriptions", value: 31600, color: "var(--color-chart-2)" },
      { name: "Rent & Office", value: 17000, color: "var(--color-chart-3)" },
      { name: "Insurance", value: 3500, color: "var(--color-chart-4)" },
      { name: "Professional", value: 5000, color: "var(--color-chart-5)" },
    ],
    monthlyTrend: [
      { month: "Jul", amount: 79000 },
      { month: "Aug", amount: 80200 },
      { month: "Sep", amount: 81400 },
      { month: "Oct", amount: 82100 },
      { month: "Nov", amount: 83000 },
      { month: "Dec", amount: 84100 },
    ],
    isMockData: true,
  }
}
