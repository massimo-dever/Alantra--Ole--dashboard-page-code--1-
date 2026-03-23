import {
  CanonicalTransaction,
  CanonicalAccount,
  CanonicalCustomer,
  CanonicalVendor,
} from "@/types/dashboard"
import { analyzeRecurringTransactions, categorizeRecurringExpenses } from "./recurringTransactionAnalyzer"

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

// Budget Management Calculations
export function calculateBudgetManagementData(
  transactions: CanonicalTransaction[],
  vendors: CanonicalVendor[]
) {
  const expenseTxns = transactions.filter((t) => t.counterparty_type === "vendor")

  const vendorTypeMap: Record<string, string> = {}
  for (const v of vendors) {
    vendorTypeMap[v.id] = v.type
  }

  // Spend by category
  const spendByCategory: Record<string, number> = {}
  for (const txn of expenseTxns) {
    const category = vendorTypeMap[txn.counterparty_id || ""] || "other"
    spendByCategory[category] = (spendByCategory[category] || 0) + txn.amount
  }

  const totalActual = expenseTxns.reduce((s, t) => s + t.amount, 0)

  // Mock budgets (in production, these would come from budget table)
  const budgetByCategory = Object.entries(spendByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, actual]) => {
      const budget = actual * 1.2 // Mock: 20% over actual
      const variance = actual - budget
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        budget: round2(budget),
        actual: round2(actual),
        variance: round2(variance),
      }
    })

  const totalBudget = budgetByCategory.reduce((s, c) => s + c.budget, 0)
  const totalVariance = budgetByCategory.reduce((s, c) => s + c.variance, 0)
  const variancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0
  const utilizationRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0
  const overBudget = budgetByCategory.filter((c) => c.variance > 0).length
  const underBudget = budgetByCategory.filter((c) => c.variance <= 0).length

  // Monthly budget trend
  const monthsData: Record<string, number> = {}
  for (const txn of expenseTxns) {
    const month = getYearMonth(txn.date)
    monthsData[month] = (monthsData[month] || 0) + txn.amount
  }

  const monthlyBudgetTrend = Object.entries(monthsData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, actual]) => ({
      month: getMonthDisplay(month),
      actual: round2(actual),
      budget: round2(actual * 1.1), // Mock budget
    }))

  // Department allocation pie chart
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  const departmentAllocation = budgetByCategory.slice(0, 5).map((cat, idx) => ({
    name: cat.category,
    value: cat.actual,
    color: colors[idx % colors.length],
  }))

  return {
    kpis: {
      totalBudget: round2(totalBudget),
      totalActual: round2(totalActual),
      totalVariance: round2(totalVariance),
      variancePercent: round2(variancePercent),
      utilizationRate: round2(utilizationRate),
      categoriesOverBudget: overBudget,
      categoriesUnderBudget: underBudget,
    },
    budgetByCategory,
    monthlyBudgetTrend,
    departmentAllocation,
  }
}

// Recurring Transactions Calculations - Uses real data analysis
export function calculateRecurringTransactionsData(
  transactions: CanonicalTransaction[],
  vendors: CanonicalVendor[]
) {
  // Analyze actual recurring transaction patterns
  const { recurringPatterns, recurringTransactions, totalRecurringMonthly } =
    analyzeRecurringTransactions(transactions, vendors)

  // Categorize the recurring patterns
  const { salaries, subscriptions, other } = categorizeRecurringExpenses(recurringPatterns)

  // Calculate totals by category
  const salariesTotal = round2(salaries.reduce((s, p) => s + p.amount, 0))
  const subscriptionsTotal = round2(subscriptions.reduce((s, p) => s + p.amount, 0))
  const otherTotal = round2(other.reduce((s, p) => s + p.amount, 0))

  // Format salary data
  const salariesData = salaries.map((pattern) => ({
    employee: pattern.vendorName,
    department: pattern.category,
    base: round2(pattern.amount * 0.85),
    bonus: round2(pattern.amount * 0.1),
    benefits: round2(pattern.amount * 0.05),
    total: pattern.amount,
  }))

  // Format subscription data
  const subscriptionsData = subscriptions.map((pattern) => ({
    vendor: pattern.vendorName,
    category: pattern.category,
    perUser: round2(pattern.amount / 20), // Estimate 20 users
    monthly: pattern.amount,
    renewalDate: new Date(new Date(pattern.lastDate).getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  }))

  // Format other recurring items
  const otherRecurring = other.map((pattern) => ({
    item: pattern.vendorName,
    category: pattern.category,
    amount: pattern.amount,
    frequency: "Monthly",
  }))

  const costBreakdown = [
    { name: "Salaries", value: salariesTotal, color: "hsl(var(--chart-1))" },
    { name: "Subscriptions", value: subscriptionsTotal, color: "hsl(var(--chart-2))" },
    { name: "Other", value: otherTotal, color: "hsl(var(--chart-3))" },
  ]

  // Monthly trend of recurring expenses
  const monthsData: Record<string, number> = {}
  for (const txn of recurringTransactions) {
    const month = getYearMonth(txn.date)
    monthsData[month] = (monthsData[month] || 0) + txn.amount
  }

  const monthlyTrend = Object.entries(monthsData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month: getMonthDisplay(month),
      amount: round2(amount),
    }))

  const changeVsPrior =
    monthlyTrend.length >= 2
      ? round2(
          ((monthlyTrend[monthlyTrend.length - 1].amount - monthlyTrend[0].amount) /
            Math.abs(monthlyTrend[0].amount || 1)) *
            100
        )
      : 0

  return {
    kpis: {
      totalMonthlyRecurring: totalRecurringMonthly,
      salariesTotal,
      subscriptionsTotal,
      otherTotal,
      changeVsPrior,
      upcomingRenewals: subscriptionsData.length,
    },
    salariesData,
    subscriptionsData,
    otherRecurring,
    costBreakdown,
    monthlyTrend,
  }
}

// Financial Goals Calculations
// NOTE: Goals data is entirely mocked - Plaid transaction data does not include goals/targets
// REQUIRES: Goals tracking table/collection with goal definitions, targets, and history
export function calculateFinancialGoalsData(
  transactions: CanonicalTransaction[]
) {
  // TODO: In production, this data should come from a goals management table
  // The function would query: goals table with columns like: id, name, target, deadline, category
  // Then compare against transaction history to calculate progress
  
  // Mock goals data (placeholder - requires real data from goals table)
  const goals = [
    {
      id: 1,
      name: "Emergency Fund",
      target: 50000,
      current: 35000,
      targetDate: "2026-12-31",
      status: "on-track",
      history: [
        { date: "2024-01-01", value: 10000 },
        { date: "2024-06-01", value: 20000 },
        { date: "2024-12-01", value: 28000 },
        { date: "2025-06-01", value: 35000 },
      ],
    },
    {
      id: 2,
      name: "Revenue Growth",
      target: 2000000,
      current: 1450000,
      targetDate: "2026-12-31",
      status: "on-track",
      history: [
        { date: "2024-01-01", value: 800000 },
        { date: "2024-06-01", value: 1000000 },
        { date: "2024-12-01", value: 1200000 },
        { date: "2025-06-01", value: 1450000 },
      ],
    },
    {
      id: 3,
      name: "Expense Reduction",
      target: 500000,
      current: 480000,
      targetDate: "2026-06-30",
      status: "at-risk",
      history: [
        { date: "2024-01-01", value: 350000 },
        { date: "2024-06-01", value: 420000 },
        { date: "2024-12-01", value: 450000 },
        { date: "2025-06-01", value: 480000 },
      ],
    },
  ]

  const totalGoals = goals.length
  const onTrack = goals.filter((g) => g.status === "on-track").length
  const atRisk = goals.filter((g) => g.status === "at-risk").length
  const overallProgress = goals.reduce((s, g) => s + (g.current / g.target) * 100, 0) / totalGoals

  const totalTargetValue = goals.reduce((s, g) => s + g.target, 0)
  const totalCurrentValue = goals.reduce((s, g) => s + g.current, 0)

  return {
    kpis: {
      totalGoals,
      onTrack,
      atRisk,
      overallProgress: round2(overallProgress),
      totalTargetValue: round2(totalTargetValue),
      totalCurrentValue: round2(totalCurrentValue),
    },
    goals,
  }
}

// Cash Positioning Calculations
export function calculateCashPositioningData(
  transactions: CanonicalTransaction[],
  accounts: CanonicalAccount[]
) {
  // Group transactions by account
  const accountBalances: Record<string, number> = {}
  for (const account of accounts) {
    accountBalances[account.id] = 0
  }

  for (const txn of transactions) {
    if (txn.account_id && txn.counterparty_type === "customer") {
      accountBalances[txn.account_id] = (accountBalances[txn.account_id] || 0) + txn.amount
    } else if (txn.account_id && txn.counterparty_type === "vendor") {
      accountBalances[txn.account_id] = (accountBalances[txn.account_id] || 0) - txn.amount
    }
  }

  const accountData = Object.entries(accountBalances)
    .map(([accountId, balance]) => {
      const account = accounts.find((a) => a.id === accountId)
      return {
        name: account?.name || "Unknown",
        balance: round2(Math.abs(balance)),
        type: account?.type || "asset",
        currency: "USD",
      }
    })
    .sort((a, b) => b.balance - a.balance)

  const totalAssets = accountData
    .filter((a) => a.type === "asset")
    .reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = accountData
    .filter((a) => a.type === "liability")
    .reduce((s, a) => s + a.balance, 0)

  return {
    kpis: {
      totalAssets: round2(totalAssets),
      totalLiabilities: round2(totalLiabilities),
      netPosition: round2(totalAssets - totalLiabilities),
      accountCount: accounts.length,
    },
    accountData,
  }
}

// Investment Portfolio Calculations
// NOTE: Portfolio data is entirely mocked - current Plaid accounts are bank/asset accounts only
// REQUIRES: Investment holdings data (stocks, holdings, cost basis, current prices)
export function calculateInvestmentPortfolioData(
  accounts: CanonicalAccount[]
) {
  // TODO: In production, this data should come from an investment holdings table or API
  // The function would query: holdings with columns like: account_id, symbol, shares, cost_basis
  // Then fetch current prices to calculate gain_loss and returns
  
  const investmentAccounts = accounts.filter(
    (a) => a.type.toLowerCase().includes("investment") || a.type.toLowerCase() === "asset"
  )

  // Mock portfolio data (placeholder - requires real holdings data)
  const portfolioData = investmentAccounts.map((acc, idx) => ({
    id: acc.id,
    name: acc.name,
    type: "Stock",
    symbol: ["AAPL", "GOOGL", "MSFT", "AMZN", "NVDA"][idx % 5],
    shares: (idx + 1) * 100,
    costBasis: (idx + 1) * 100 * 150,
    currentValue: (idx + 1) * 100 * 175,
    gainLoss: (idx + 1) * 100 * 25,
    gainLossPercent: 16.67,
    allocation: (1 / investmentAccounts.length) * 100,
  }))

  const totalValue = portfolioData.reduce((s, p) => s + p.currentValue, 0)
  const totalGainLoss = portfolioData.reduce((s, p) => s + p.gainLoss, 0)
  const avgReturn = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0

  // Format for dashboard
  const assetAllocation = portfolioData
    .slice(0, 5)
    .map((p, idx) => ({
      name: p.symbol,
      value: p.currentValue,
      color: [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))",
      ][idx % 5],
    }))

  const portfolioHistory = [
    { date: "Jan", value: totalValue * 0.8 },
    { date: "Feb", value: totalValue * 0.85 },
    { date: "Mar", value: totalValue * 0.92 },
    { date: "Apr", value: totalValue },
  ]

  const dayChange = totalGainLoss * 0.1
  const dayChangePercent = (dayChange / (totalValue - dayChange)) * 100

  const holdings = portfolioData.map((p) => ({
    ticker: p.symbol,
    name: p.name,
    quantity: p.shares,
    costBasis: round2(p.costBasis / p.shares),
    currentPrice: round2(p.currentValue / p.shares),
    pnl: round2(p.gainLoss),
    dayChange: round2(p.gainLoss * 0.1),
  }))

  return {
    kpis: {
      totalValue: round2(totalValue),
      dayChange: round2(dayChange),
      dayChangePercent: round2(dayChangePercent),
      totalReturn: round2(totalGainLoss),
      totalReturnPercent: round2(avgReturn),
      dividendYield: 2.5, // Mock value
    },
    assetAllocation,
    portfolioHistory,
    holdings,
  }
}

// Cash Positioning Data for Dashboard
export function calculateCashPositioningForDashboard(
  transactions: CanonicalTransaction[],
  accounts: CanonicalAccount[]
) {
  // Calculate balance over time
  const monthsData: Record<string, number> = {}
  for (const txn of transactions) {
    const month = getYearMonth(txn.date)
    if (!monthsData[month]) monthsData[month] = 0
    if (txn.counterparty_type === "customer") {
      monthsData[month] += txn.amount
    } else {
      monthsData[month] -= txn.amount
    }
  }

  let runningBalance = 0
  const cashBalanceData = Object.entries(monthsData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, change]) => {
      runningBalance += change
      return {
        date: getMonthDisplay(month),
        balance: runningBalance,
      }
    })

  // Calculate actual account balances from transactions
  const accountBalances: Record<string, { balance: number; lastDate: string }> = {}
  for (const account of accounts) {
    accountBalances[account.id] = { balance: 0, lastDate: "" }
  }

  for (const txn of transactions) {
    if (txn.account_id) {
      if (!accountBalances[txn.account_id]) {
        accountBalances[txn.account_id] = { balance: 0, lastDate: "" }
      }
      // Inflows from customers, outflows to vendors
      if (txn.counterparty_type === "customer") {
        accountBalances[txn.account_id].balance += txn.amount
      } else {
        accountBalances[txn.account_id].balance -= txn.amount
      }
      // Track most recent transaction
      if (!accountBalances[txn.account_id].lastDate || new Date(txn.date) > new Date(accountBalances[txn.account_id].lastDate)) {
        accountBalances[txn.account_id].lastDate = txn.date
      }
    }
  }

  // Entity breakdown - using calculated balances for asset accounts
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

  const assetAccounts = accounts
    .filter((a) => a.type === "asset")
    .map((acc) => ({
      name: acc.name,
      balance: Math.abs(accountBalances[acc.id]?.balance || 0),
    }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)

  const entityBreakdown = assetAccounts.map((acc, idx) => ({
    name: acc.name,
    value: round2(acc.balance),
    color: colors[idx % colors.length],
  }))

  // Accounts data with calculated balances
  const accountsData = accounts
    .map((acc) => ({
      name: acc.name,
      entity: acc.name.split(" ")[0], // Extract first word as entity
      type: acc.type,
      currency: "USD",
      amount: round2(Math.abs(accountBalances[acc.id]?.balance || 0)),
      lastUpdated: accountBalances[acc.id]?.lastDate || new Date().toISOString().split("T")[0],
    }))
    .sort((a, b) => b.amount - a.amount)

  return {
    cashBalanceData,
    entityBreakdown,
    accountsData,
  }
}
