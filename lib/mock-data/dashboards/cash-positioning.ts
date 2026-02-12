export function getCashPositioningData(filters?: { entity?: string; accountType?: string }) {
  const cashBalanceData = [
    { date: "Jan", balance: 5200000 },
    { date: "Feb", balance: 5350000 },
    { date: "Mar", balance: 5500000 },
    { date: "Apr", balance: 5450000 },
    { date: "May", balance: 5600000 },
    { date: "Jun", balance: 5750000 },
    { date: "Jul", balance: 5800000 },
    { date: "Aug", balance: 5900000 },
    { date: "Sep", balance: 5850000 },
    { date: "Oct", balance: 6000000 },
    { date: "Nov", balance: 6100000 },
    { date: "Dec", balance: 6200000 },
  ]

  const entityBreakdown = [
    { name: "US Entity", value: 3500000, color: "#3b82f6" },
    { name: "UK Entity", value: 1500000, color: "#10b981" },
    { name: "EU Entity", value: 800000, color: "#f59e0b" },
    { name: "CA Entity", value: 400000, color: "#ef4444" },
  ]

  let accountsData = [
    { name: "Chase Business", entity: "US Entity", type: "Bank", currency: "USD", amount: 2500000, lastUpdated: "2024-12-15" },
    { name: "Wells Fargo", entity: "US Entity", type: "Bank", currency: "USD", amount: 1000000, lastUpdated: "2024-12-15" },
    { name: "Barclays UK", entity: "UK Entity", type: "Bank", currency: "GBP", amount: 1200000, lastUpdated: "2024-12-14" },
    { name: "Deutsche Bank", entity: "EU Entity", type: "Bank", currency: "EUR", amount: 750000, lastUpdated: "2024-12-14" },
    { name: "RBC Canada", entity: "CA Entity", type: "Bank", currency: "CAD", amount: 550000, lastUpdated: "2024-12-13" },
    { name: "Investment Account", entity: "US Entity", type: "Investment", currency: "USD", amount: 2000000, lastUpdated: "2024-12-15" },
  ]

  if (filters?.entity) {
    accountsData = accountsData.filter(a => a.entity.toLowerCase().includes(filters.entity!.toLowerCase()))
  }
  if (filters?.accountType) {
    accountsData = accountsData.filter(a => a.type.toLowerCase() === filters.accountType!.toLowerCase())
  }

  return { cashBalanceData, entityBreakdown, accountsData, isMockData: true }
}
