"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Transaction } from "@/lib/mock-data/transactions"

const fetcher = (url: string) => fetch(url).then(res => res.json())

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "payroll", label: "Payroll" },
  { value: "marketing", label: "Marketing" },
  { value: "software", label: "Software" },
  { value: "office", label: "Office" },
  { value: "travel", label: "Travel" },
  { value: "professional-services", label: "Professional Services" },
  { value: "utilities", label: "Utilities" },
  { value: "rent", label: "Rent" },
  { value: "revenue", label: "Revenue" },
  { value: "subscription", label: "Subscription" },
  { value: "other", label: "Other" },
]

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
]

interface TransactionsResponse {
  transactions: Transaction[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export function TransactionsView() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [type, setType] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", "25")
    params.set("sortBy", sortBy)
    params.set("sortOrder", sortOrder)
    if (search) params.set("search", search)
    if (category !== "all") params.set("category", category)
    if (type !== "all") params.set("type", type)
    return `/api/transactions?${params.toString()}`
  }, [page, search, category, type, sortBy, sortOrder])

  const { data, isLoading } = useSWR<TransactionsResponse>(buildUrl(), fetcher, {
    revalidateOnFocus: false,
  })

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
    setPage(1)
  }

  const handleExport = () => {
    window.open("/api/spreadsheet/export?type=transactions&format=csv", "_blank")
  }

  const transactions = data?.transactions || []
  const pagination = data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 }

  return (
    <div className="flex-1 overflow-auto p-6">
      <Card className="shadow-sm border-border">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Transactions</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs bg-transparent">
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mt-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search merchants, descriptions..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={category} onValueChange={v => { setCategory(v); setPage(1) }}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={v => { setType(v); setPage(1) }}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <SortableHead label="Date" column="date" current={sortBy} order={sortOrder} onSort={handleSort} />
                  <SortableHead label="Merchant" column="merchant" current={sortBy} order={sortOrder} onSort={handleSort} />
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Description</TableHead>
                  <SortableHead label="Category" column="category" current={sortBy} order={sortOrder} onSort={handleSort} />
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Type</TableHead>
                  <SortableHead label="Amount" column="amount" current={sortBy} order={sortOrder} onSort={handleSort} className="text-right" />
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-border/30">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="py-2.5">
                          <div className="h-3.5 w-20 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground text-xs py-8">
                      No transactions found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map(txn => (
                    <TableRow key={txn.id} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                      <TableCell className="text-muted-foreground py-2.5 whitespace-nowrap">{txn.date}</TableCell>
                      <TableCell className="font-medium text-foreground/80 py-2.5">{txn.merchant}</TableCell>
                      <TableCell className="text-foreground/60 py-2.5 max-w-[200px] truncate">{txn.description}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[10px] font-medium capitalize">{txn.category}</Badge>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          variant={txn.type === "income" ? "default" : "outline"}
                          className={
                            txn.type === "income"
                              ? "bg-green-100 text-green-700 text-[10px]"
                              : txn.type === "expense"
                                ? "bg-red-50 text-red-600 text-[10px]"
                                : "text-[10px]"
                          }
                        >
                          {txn.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium py-2.5 ${txn.amount >= 0 ? "text-green-600" : "text-foreground"}`}>
                        {txn.amount >= 0 ? "+" : ""}${Math.abs(txn.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          variant="outline"
                          className={
                            txn.status === "cleared" ? "bg-green-50 text-green-600 text-[10px]"
                            : txn.status === "pending" ? "bg-amber-50 text-amber-600 text-[10px]"
                            : "bg-blue-50 text-blue-600 text-[10px]"
                          }
                        >
                          {txn.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-7 bg-transparent" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button variant="outline" size="icon" className="size-7 bg-transparent" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SortableHead({
  label, column, current, order, onSort, className = "",
}: {
  label: string; column: string; current: string; order: "asc" | "desc"; onSort: (col: string) => void; className?: string
}) {
  const isActive = current === column
  return (
    <TableHead className={`text-xs font-medium text-muted-foreground h-9 cursor-pointer select-none ${className}`} onClick={() => onSort(column)}>
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`size-3 ${isActive ? "text-foreground" : "text-muted-foreground/50"}`} />
      </span>
    </TableHead>
  )
}
