export function getOverviewData() {
  const monthlyData = [
    { month: "Jan", revenue: 450000, expenses: 320000, netIncome: 130000 },
    { month: "Feb", revenue: 480000, expenses: 340000, netIncome: 140000 },
    { month: "Mar", revenue: 520000, expenses: 360000, netIncome: 160000 },
    { month: "Apr", revenue: 510000, expenses: 350000, netIncome: 160000 },
    { month: "May", revenue: 550000, expenses: 380000, netIncome: 170000 },
    { month: "Jun", revenue: 580000, expenses: 400000, netIncome: 180000 },
    { month: "Jul", revenue: 600000, expenses: 420000, netIncome: 180000 },
    { month: "Aug", revenue: 620000, expenses: 430000, netIncome: 190000 },
    { month: "Sep", revenue: 610000, expenses: 410000, netIncome: 200000 },
    { month: "Oct", revenue: 640000, expenses: 440000, netIncome: 200000 },
    { month: "Nov", revenue: 660000, expenses: 450000, netIncome: 210000 },
    { month: "Dec", revenue: 680000, expenses: 460000, netIncome: 220000 },
  ]

  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0)
  const totalExpenses = monthlyData.reduce((sum, d) => sum + d.expenses, 0)
  const netIncome = totalRevenue - totalExpenses
  const avgMonthlyExpenses = totalExpenses / monthlyData.length
  const runway = 5000000 / avgMonthlyExpenses
  const savingsRate = Number(((netIncome / totalRevenue) * 100).toFixed(2))

  return {
    monthlyData,
    kpis: {
      totalRevenue,
      totalExpenses,
      netIncome,
      avgMonthlyExpenses,
      runway: Number(runway.toFixed(1)),
      savingsRate,
      activeAccounts: 6,
      monthlyGrowth: 15.2,
      lastRefresh: new Date().toISOString(),
    },
    isMockData: true,
  }
}
