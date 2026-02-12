export function getIncomeAnalysisData() {
  const incomeBySource = [
    { name: "Product Sales", value: 1800000, color: "#3b82f6" },
    { name: "Subscription Revenue", value: 1200000, color: "#10b981" },
    { name: "Services", value: 500000, color: "#f59e0b" },
    { name: "Other", value: 400000, color: "#8b5cf6" },
  ]

  const monthlyIncome = [
    { month: "Jan", amount: 450000 },
    { month: "Feb", amount: 480000 },
    { month: "Mar", amount: 520000 },
    { month: "Apr", amount: 510000 },
    { month: "May", amount: 550000 },
    { month: "Jun", amount: 580000 },
  ]

  const ytdIncome = [
    { period: "Q1", amount: 1450000 },
    { period: "Q2", amount: 1640000 },
    { period: "Q3", amount: 1800000 },
    { period: "Q4", amount: 1950000 },
  ]

  const incomeSources = [
    { source: "Product Sales", monthly: 300000, ytd: 1800000, growth: "+15.2%", recurring: false },
    { source: "Subscription Revenue", monthly: 200000, ytd: 1200000, growth: "+22.5%", recurring: true },
    { source: "Services", monthly: 83000, ytd: 500000, growth: "+8.3%", recurring: false },
    { source: "Consulting", monthly: 50000, ytd: 300000, growth: "+12.1%", recurring: false },
    { source: "Other", monthly: 67000, ytd: 400000, growth: "+5.2%", recurring: false },
  ]

  return { incomeBySource, monthlyIncome, ytdIncome, incomeSources, isMockData: true }
}
