export function getCashFlowData() {
  return {
    kpis: {
      netCashFlow: 940000,
      totalInflow: 3090000,
      totalOutflow: 2150000,
      operatingMargin: 30.4,
      monthOverMonth: 5.8,
      projectedRunway: 18,
    },
    monthlyCashFlow: [
      { month: "Jan", inflow: 450000, outflow: 320000, net: 130000 },
      { month: "Feb", inflow: 480000, outflow: 340000, net: 140000 },
      { month: "Mar", inflow: 520000, outflow: 360000, net: 160000 },
      { month: "Apr", inflow: 510000, outflow: 350000, net: 160000 },
      { month: "May", inflow: 550000, outflow: 380000, net: 170000 },
      { month: "Jun", inflow: 580000, outflow: 400000, net: 180000 },
    ],
    waterfallData: [
      { name: "Opening Balance", value: 2400000, fill: "var(--color-chart-3)" },
      { name: "Revenue", value: 3090000, fill: "var(--color-chart-2)" },
      { name: "Payroll", value: -1200000, fill: "var(--color-chart-5)" },
      { name: "Marketing", value: -450000, fill: "var(--color-chart-5)" },
      { name: "R&D", value: -300000, fill: "var(--color-chart-5)" },
      { name: "Other Ops", value: -200000, fill: "var(--color-chart-5)" },
      { name: "Closing Balance", value: 3340000, fill: "var(--color-chart-1)" },
    ],
    categoryBreakdown: [
      { category: "Revenue", amount: 3090000, percentage: 100, type: "inflow" as const },
      { category: "Payroll", amount: 1200000, percentage: 38.8, type: "outflow" as const },
      { category: "Marketing", amount: 450000, percentage: 14.6, type: "outflow" as const },
      { category: "R&D", amount: 300000, percentage: 9.7, type: "outflow" as const },
      { category: "Office & Ops", amount: 200000, percentage: 6.5, type: "outflow" as const },
    ],
    isMockData: true,
  }
}
