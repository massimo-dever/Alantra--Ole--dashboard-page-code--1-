export interface Transaction {
  id: string
  merchant: string
  description: string
  date: string
  category: string
  department: string
  type: "expense" | "income" | "transfer"
  amount: number
  account: string
  status: "cleared" | "pending" | "reconciled"
}

const categories = ["payroll", "marketing", "software", "office", "travel", "professional-services", "utilities", "insurance", "rent", "revenue", "subscription", "other"]
const departments = ["Engineering", "Marketing", "Sales", "Operations", "Finance", "HR", "Executive"]
const merchants = [
  "AWS", "Google Cloud", "Slack", "Figma", "GitHub", "Notion",
  "WeWork", "Uber", "Delta Airlines", "Hilton Hotels",
  "ADP Payroll", "Google Ads", "Meta Ads", "HubSpot",
  "Salesforce", "Zoom", "Dropbox", "Adobe",
  "Stripe", "Peak Performance Partners", "Catalyst Consulting",
  "Office Depot", "Staples", "FedEx", "UPS",
  "Con Edison", "AT&T", "Verizon", "State Farm",
  "Product Revenue", "Service Revenue", "Subscription Revenue", "Consulting Revenue",
]

function generateTransactions(): Transaction[] {
  const transactions: Transaction[] = []
  const now = new Date()

  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 365)
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)

    const isIncome = Math.random() > 0.7
    const merchant = merchants[Math.floor(Math.random() * merchants.length)]
    const category = isIncome ? "revenue" : categories[Math.floor(Math.random() * (categories.length - 1))]
    const amount = isIncome
      ? Math.floor(Math.random() * 200000) + 10000
      : -(Math.floor(Math.random() * 50000) + 500)

    transactions.push({
      id: `txn_${String(i + 1).padStart(4, "0")}`,
      merchant,
      description: `${isIncome ? "Payment from" : "Payment to"} ${merchant}`,
      date: date.toISOString().split("T")[0],
      category,
      department: departments[Math.floor(Math.random() * departments.length)],
      type: isIncome ? "income" : "expense",
      amount,
      account: ["Chase Business", "Wells Fargo", "Barclays UK"][Math.floor(Math.random() * 3)],
      status: ["cleared", "pending", "reconciled"][Math.floor(Math.random() * 3)] as Transaction["status"],
    })
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

let cachedTransactions: Transaction[] | null = null

export function getTransactions() {
  if (!cachedTransactions) {
    cachedTransactions = generateTransactions()
  }
  return cachedTransactions
}
