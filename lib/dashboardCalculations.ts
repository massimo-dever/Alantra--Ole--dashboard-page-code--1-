import {
  CanonicalTransaction,
  CanonicalAccount,
  CanonicalCustomer,
  CanonicalVendor,
} from "@/types/dashboard"

function getYearMonth(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function getMonthDisplay(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString("default", { month: "short", year: "2-digit" })
}

// Overview Dashboard Calculations
export function calculateOverviewData(
  transactions: CanonicalTransaction[],
  accounts: CanonicalAccount[],
  customers: CanonicalCustomer[],
  vendors: CanonicalVendor[]
) {
  const incomeTxns = transactions.filter((t) => t.counterparty_type === "customer")
  const expenseTxns = transactions.filter((t) => t.counterparty_type === "vendor")

  const totalIncome = incomeTxns.reduce((s, t) => s + t.amount, 0)
  const totalExpenses = expenseTxns.reduce((s, t) => s + t.amount, 0)
  const netIncome = totalIncome - totalExpenses

  // Group by month
  const monthsData: Record<string, { revenue: number; expenses: number }> = {}
  for (const txn of transactions) {
    const month = getYearMonth(txn.date)
    if (!monthsData[month]) monthsData[month] = { revenue: 0, expenses: 0 }
    if (txn.counterparty_type === "customer") {
      monthsData[month].revenue += txn.amount
    } else {
      monthsData[month].expenses += txn.amount
    }
  }

  const monthlyData = Object.entries(monthsData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: getMonthDisplay(month),
      revenue: round2(data.revenue),
      expenses: round2(data.expenses),
      netIncome: round2(data.revenue - data.expenses),
    }))

  const uniqueMonths = Object.keys(monthsData).length
  const avgMonthlyExpenses = uniqueMonths > 0 ? totalExpenses / uniqueMonths : 0
  const monthlyBurnRate = avgMonthlyExpenses

  // Calculate runway (months of expenses covered by net income)
  const netPositiveMonths = Object.entries(monthsData).filter(
    ([_, data]) => data.revenue > data.expenses
  ).length
  const runway =
    netIncome > 0 && avgMonthlyExpenses > 0
      ? Math.floor(netIncome / avgMonthlyExpenses)
      : 0

  const savingsRate =
    totalIncome > 0 ? round2((netIncome / totalIncome) * 100) : 0

  const monthlyGrowth =
    monthlyData.length >= 2
      ? round2(
          ((monthlyData[monthlyData.length - 1].revenue -
            monthlyData[0].revenue) /
            monthlyData[0].revenue) *
            100
        )
      : 0

  return {
    monthlyData,
    kpis: {
      totalRevenue: round2(totalIncome),
      totalExpenses: round2(totalExpenses),
      netIncome: round2(netIncome),
      avgMonthlyExpenses: round2(avgMonthlyExpenses),
      runway,
      savingsRate,
      activeAccounts: accounts.length,
      monthlyGrowth,
      lastRefresh: new Date().toISOString(),
    },
  }
}

// Cash Flow Dashboard Calculations
export function calculateCashFlowData(
  transactions: CanonicalTransaction[],
  accounts: CanonicalAccount[]
) {
  const incomeTxns = transactions.filter((t) => t.counterparty_type === "customer")
  const expenseTxns = transactions.filter((t) => t.counterparty_type === "vendor")

  const totalInflow = incomeTxns.reduce((s, t) => s + t.amount, 0)
  const totalOutflow = expenseTxns.reduce((s, t) => s + t.amount, 0)
  const netCashFlow = totalInflow - totalOutflow

  // Group by month
  const monthsData: Record<
    string,
    { inflow: number; outflow: number }
  > = {}
  for (const txn of transactions) {
    const month = getYearMonth(txn.date)
    if (!monthsData[month]) monthsData[month] = { inflow: 0, outflow: 0 }
    if (txn.counterparty_type === "customer") {
      monthsData[month].inflow += txn.amount
    } else {
      monthsData[month].outflow += txn.amount
    }
  }

  const monthlyCashFlow = Object.entries(monthsData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: getMonthDisplay(month),
      inflow: round2(data.inflow),
      outflow: round2(data.outflow),
      net: round2(data.inflow - data.outflow),
    }))

  // Operating margin
  const operatingMargin =
    totalInflow > 0 ? round2((netCashFlow / totalInflow) * 100) : 0

  // Month over month change
  const monthOverMonth =
    monthlyCashFlow.length >= 2
      ? round2(
          ((monthlyCashFlow[monthlyCashFlow.length - 1].net -
            monthlyCashFlow[0].net) /
            Math.abs(monthlyCashFlow[0].net || 1)) *
            100
        )
      : 0

  // Projected runway
  const avgMonthlyOutflow =
    monthlyCashFlow.length > 0
      ? monthlyCashFlow.reduce((s, m) => s + m.outflow, 0) /
        monthlyCashFlow.length
      : 0
  const projectedRunway =
    netCashFlow > 0 && avgMonthlyOutflow > 0
      ? Math.floor(netCashFlow / avgMonthlyOutflow)
      : 0

  // Waterfall data
  const waterfallData = [
    { name: "Starting Balance", value: 0, fill: "hsl(var(--chart-1))" },
    { name: "Total Inflow", value: totalInflow, fill: "hsl(var(--chart-2))" },
    { name: "Total Outflow", value: -totalOutflow, fill: "hsl(var(--chart-5))" },
    { name: "Net Cash Flow", value: netCashFlow, fill: "hsl(var(--chart-3))" },
  ]

  // Category breakdown (by counterparty type)
  const categoryBreakdown = [
    {
      category: "Income",
      amount: round2(totalInflow),
      percentage: round2((totalInflow / (totalInflow + totalOutflow)) * 100),
      type: "inflow" as const,
    },
    {
      category: "Expenses",
      amount: round2(totalOutflow),
      percentage: round2((totalOutflow / (totalInflow + totalOutflow)) * 100),
      type: "outflow" as const,
    },
  ]

  return {
    kpis: {
      netCashFlow: round2(netCashFlow),
      totalInflow: round2(totalInflow),
      totalOutflow: round2(totalOutflow),
      operatingMargin,
      monthOverMonth,
      projectedRunway,
    },
    monthlyCashFlow,
    waterfallData,
    categoryBreakdown,
  }
}

// Spending Analysis Dashboard Calculations
export function calculateSpendingAnalysisData(
  transactions: CanonicalTransaction[],
  vendors: CanonicalVendor[]
) {
  const expenseTxns = transactions.filter((t) => t.counterparty_type === "vendor")

  const totalSpend = expenseTxns.reduce((s, t) => s + t.amount, 0)

  // Spending by category
  const vendorTypeMap: Record<string, string> = {}
  for (const v of vendors) {
    vendorTypeMap[v.id] = v.type
  }

  const spendByCategory: Record<string, number> = {}
  for (const txn of expenseTxns) {
    const category = vendorTypeMap[txn.counterparty_id || ""] || "other"
    spendByCategory[category] = (spendByCategory[category] || 0) + txn.amount
  }

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  const spendingByCategory = Object.entries(spendByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], idx) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: round2(value),
      color: colors[idx % colors.length],
    }))

  // Monthly spending trend
  const monthsData: Record<string, number> = {}
  for (const txn of expenseTxns) {
    const month = getYearMonth(txn.date)
    monthsData[month] = (monthsData[month] || 0) + txn.amount
  }

  const monthlySpending = Object.entries(monthsData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month: getMonthDisplay(month),
      amount: round2(amount),
    }))

  // Top merchants
  const spendByVendor: Record<string, number> = {}
  for (const txn of expenseTxns) {
    const vendorId = txn.counterparty_id || ""
    spendByVendor[vendorId] = (spendByVendor[vendorId] || 0) + txn.amount
  }

  const topMerchants = Object.entries(spendByVendor)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([vendorId, amount]) => {
      const vendor = vendors.find((v) => v.id === vendorId)
      const categoryType = vendor?.type || "other"
      const variance = Math.random() * 20 - 10 // Mock variance
      return {
        merchant: vendor?.name || "Unknown",
        category: categoryType,
        amount: round2(amount),
        budget: round2(amount * 1.1), // Mock budget
        variance: `${variance > 0 ? "+" : ""}${variance.toFixed(1)}%`,
      }
    })

  // KPIs
  const avgDailySpend =
    expenseTxns.length > 0
      ? totalSpend / new Set(expenseTxns.map((t) => t.date)).size
      : 0

  const change = monthlySpending.length >= 2
    ? round2(
        ((monthlySpending[monthlySpending.length - 1].amount -
          monthlySpending[0].amount) /
          monthlySpending[0].amount) *
          100
      )
    : 0

  return {
    spendingByCategory,
    monthlySpending,
    topMerchants,
    kpis: {
      totalSpend: round2(totalSpend),
      change,
      avgDailySpend: round2(avgDailySpend),
    },
  }
}

// Income Analysis Dashboard Calculations
export function calculateIncomeAnalysisData(
  transactions: CanonicalTransaction[],
  customers: CanonicalCustomer[]
) {
  const incomeTxns = transactions.filter((t) => t.counterparty_type === "customer")

  const totalIncome = incomeTxns.reduce((s, t) => s + t.amount, 0)

  // Income by source
  const incomeByCustomer: Record<string, number> = {}
  for (const txn of incomeTxns) {
    const customerId = txn.counterparty_id || ""
    incomeByCustomer[customerId] = (incomeByCustomer[customerId] || 0) + txn.amount
  }

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  const incomeBySource = Object.entries(incomeByCustomer)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([customerId, value], idx) => {
      const customer = customers.find((c) => c.id === customerId)
      return {
        name: customer?.name || "Unknown",
        value: round2(value),
        color: colors[idx % colors.length],
      }
    })

  // Monthly income
  const monthsData: Record<string, number> = {}
  for (const txn of incomeTxns) {
    const month = getYearMonth(txn.date)
    monthsData[month] = (monthsData[month] || 0) + txn.amount
  }

  const monthlyIncome = Object.entries(monthsData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month: getMonthDisplay(month),
      amount: round2(amount),
    }))

  // YTD Income
  const currentYear = new Date().getFullYear()
  const ytdData: Record<string, number> = {}
  for (const txn of incomeTxns) {
    const year = new Date(txn.date).getFullYear()
    if (year === currentYear) {
      const quarter = Math.ceil((new Date(txn.date).getMonth() + 1) / 3)
      const periodKey = `Q${quarter} ${year}`
      ytdData[periodKey] = (ytdData[periodKey] || 0) + txn.amount
    }
  }

  const ytdIncome = Object.entries(ytdData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, amount]) => ({
      period,
      amount: round2(amount),
    }))

  // Income sources table
  const incomeSources = Object.entries(incomeByCustomer)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([customerId, total]) => {
      const customer = customers.find((c) => c.id === customerId)
      const monthlyAvg = total / (Object.keys(monthsData).length || 1)
      const growth = Math.random() * 50 - 25 // Mock growth
      return {
        source: customer?.name || "Unknown",
        monthly: round2(monthlyAvg),
        ytd: round2(total),
        growth: `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`,
        recurring: Math.random() > 0.5,
      }
    })

  return {
    incomeBySource,
    monthlyIncome,
    ytdIncome,
    incomeSources,
  }
}
