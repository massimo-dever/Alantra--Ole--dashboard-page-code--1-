import {
  CanonicalTransaction,
  CanonicalVendor,
} from "@/types/dashboard"

interface RecurringPattern {
  vendorId: string
  vendorName: string
  dayOfMonth: number
  amount: number
  frequency: "monthly" | "weekly" | "biweekly"
  occurrences: number
  lastDate: string
  category: string
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Analyze transactions to identify recurring payment patterns
 * Looks for transactions with the same vendor on similar days of the month
 */
export function analyzeRecurringTransactions(
  transactions: CanonicalTransaction[],
  vendors: CanonicalVendor[]
): {
  recurringPatterns: RecurringPattern[]
  recurringTransactions: CanonicalTransaction[]
  totalRecurringMonthly: number
} {
  // Filter for vendor transactions only
  const expenseTxns = transactions.filter((t) => t.counterparty_type === "vendor")

  // Create vendor lookup map
  const vendorMap = new Map(vendors.map((v) => [v.id, v]))

  // Group transactions by vendor and day of month
  const txnsByVendorDay: Map<string, CanonicalTransaction[]> = new Map()

  for (const txn of expenseTxns) {
    const date = new Date(txn.date)
    const dayOfMonth = date.getDate()
    const vendorId = txn.counterparty_id || ""
    const key = `${vendorId}_${dayOfMonth}`

    if (!txnsByVendorDay.has(key)) {
      txnsByVendorDay.set(key, [])
    }
    txnsByVendorDay.get(key)!.push(txn)
  }

  // Identify recurring patterns (2+ occurrences in different months)
  const recurringPatterns: RecurringPattern[] = []
  const recurringTxns: Set<string> = new Set()

  for (const [key, txns] of txnsByVendorDay.entries()) {
    if (txns.length >= 2) {
      // Check if transactions span different months
      const months = new Set(txns.map((t) => {
        const d = new Date(t.date)
        return `${d.getFullYear()}-${d.getMonth()}`
      }))

      if (months.size >= 2) {
        const [vendorId, dayStr] = key.split("_")
        const dayOfMonth = parseInt(dayStr)
        const vendor = vendorMap.get(vendorId)
        const avgAmount = round2(txns.reduce((s, t) => s + t.amount, 0) / txns.length)
        const lastTxn = txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

        recurringPatterns.push({
          vendorId,
          vendorName: vendor?.name || "Unknown",
          dayOfMonth,
          amount: avgAmount,
          frequency: "monthly",
          occurrences: txns.length,
          lastDate: lastTxn.date,
          category: vendor?.type || "other",
        })

        txns.forEach((t) => recurringTxns.add(t.id))
      }
    }
  }

  // Calculate total recurring monthly
  const totalRecurringMonthly = round2(
    recurringPatterns.reduce((sum, p) => sum + p.amount, 0)
  )

  const recurringTransactions = expenseTxns.filter((t) => recurringTxns.has(t.id))

  return {
    recurringPatterns: recurringPatterns.sort((a, b) => b.amount - a.amount),
    recurringTransactions,
    totalRecurringMonthly,
  }
}

/**
 * Categorize recurring expenses into groups
 */
export function categorizeRecurringExpenses(patterns: RecurringPattern[]) {
  const salaries: RecurringPattern[] = []
  const subscriptions: RecurringPattern[] = []
  const other: RecurringPattern[] = []

  for (const pattern of patterns) {
    const category = pattern.category.toLowerCase()
    if (
      category.includes("payroll") ||
      category.includes("salary") ||
      category.includes("wage") ||
      pattern.vendorName.toLowerCase().includes("payroll")
    ) {
      salaries.push(pattern)
    } else if (
      category.includes("software") ||
      category.includes("subscription") ||
      category.includes("saas") ||
      pattern.amount < 5000 // Subscriptions are typically < $5k/month
    ) {
      subscriptions.push(pattern)
    } else {
      other.push(pattern)
    }
  }

  return { salaries, subscriptions, other }
}
