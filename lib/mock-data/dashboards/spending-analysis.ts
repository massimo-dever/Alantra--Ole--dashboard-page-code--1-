export function getSpendingAnalysisData() {
  const spendingByCategory = [
    { name: "Payroll", value: 1200000, color: "#3b82f6" },
    { name: "Marketing", value: 450000, color: "#10b981" },
    { name: "R&D", value: 300000, color: "#f59e0b" },
    { name: "Office", value: 150000, color: "#ef4444" },
    { name: "Software", value: 100000, color: "#8b5cf6" },
    { name: "Other", value: 50000, color: "#64748b" },
  ]

  const monthlySpending = [
    { month: "Jan", amount: 320000 },
    { month: "Feb", amount: 340000 },
    { month: "Mar", amount: 360000 },
    { month: "Apr", amount: 350000 },
    { month: "May", amount: 380000 },
    { month: "Jun", amount: 400000 },
  ]

  const topMerchants = [
    { merchant: "Peak Performance Partners", category: "Professional Services", amount: 125000, budget: 100000, variance: "+25%" },
    { merchant: "Catalyst Consulting Co.", category: "Marketing", amount: 95000, budget: 80000, variance: "+18.8%" },
    { merchant: "AWS", category: "Software", amount: 85000, budget: 90000, variance: "-5.6%" },
    { merchant: "Google Ads", category: "Marketing", amount: 72000, budget: 70000, variance: "+2.9%" },
    { merchant: "Slack", category: "Software", amount: 45000, budget: 40000, variance: "+12.5%" },
  ]

  const totalSpend = spendingByCategory.reduce((sum, item) => sum + item.value, 0)
  const change = 8.7
  const avgDailySpend = totalSpend / 180

  return {
    spendingByCategory,
    monthlySpending,
    topMerchants,
    kpis: { totalSpend, change, avgDailySpend },
    isMockData: true,
  }
}
