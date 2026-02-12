import { NextRequest, NextResponse } from "next/server"
import { parseTransactionFilters } from "@/lib/validations/transaction-filters"
import { getTransactions } from "@/lib/mock-data/transactions"

export async function GET(request: NextRequest) {
  try {
    const filters = parseTransactionFilters(request.nextUrl.searchParams)
    let transactions = getTransactions()

    if (filters.category) {
      transactions = transactions.filter(t => t.category === filters.category)
    }
    if (filters.type) {
      transactions = transactions.filter(t => t.type === filters.type)
    }
    if (filters.department) {
      transactions = transactions.filter(t => t.department.toLowerCase().includes(filters.department!.toLowerCase()))
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      transactions = transactions.filter(t =>
        t.merchant.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    }
    if (filters.from) {
      transactions = transactions.filter(t => t.date >= filters.from!)
    }
    if (filters.to) {
      transactions = transactions.filter(t => t.date <= filters.to!)
    }

    const sortDir = filters.sortOrder === "asc" ? 1 : -1
    transactions.sort((a, b) => {
      switch (filters.sortBy) {
        case "amount": return (a.amount - b.amount) * sortDir
        case "merchant": return a.merchant.localeCompare(b.merchant) * sortDir
        case "category": return a.category.localeCompare(b.category) * sortDir
        default: return (new Date(a.date).getTime() - new Date(b.date).getTime()) * sortDir
      }
    })

    const total = transactions.length
    const start = (filters.page - 1) * filters.limit
    const paginated = transactions.slice(start, start + filters.limit)

    return NextResponse.json({
      transactions: paginated,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Invalid filter parameters" }, { status: 400 })
  }
}
