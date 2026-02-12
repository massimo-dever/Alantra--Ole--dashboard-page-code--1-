"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

interface SyncHistoryItem {
  id: string
  connectorId: string
  connectorName: string
  status: "success" | "failed" | "partial" | "running"
  startedAt: string
  completedAt: string | null
  recordCount: number | null
  error: string | null
  duration: string | null
}

const mockHistory: SyncHistoryItem[] = [
  { id: "1", connectorId: "plaid-1", connectorName: "Plaid - Chase", status: "success", startedAt: "2024-12-15T10:30:00Z", completedAt: "2024-12-15T10:31:15Z", recordCount: 342, error: null, duration: "1m 15s" },
  { id: "2", connectorId: "plaid-2", connectorName: "Plaid - Wells Fargo", status: "success", startedAt: "2024-12-15T10:30:00Z", completedAt: "2024-12-15T10:30:45Z", recordCount: 128, error: null, duration: "45s" },
  { id: "3", connectorId: "stripe-1", connectorName: "Stripe", status: "success", startedAt: "2024-12-15T10:25:00Z", completedAt: "2024-12-15T10:26:30Z", recordCount: 89, error: null, duration: "1m 30s" },
  { id: "4", connectorId: "csv-1", connectorName: "CSV Import", status: "partial", startedAt: "2024-12-14T15:00:00Z", completedAt: "2024-12-14T15:01:00Z", recordCount: 50, error: "3 rows skipped due to invalid format", duration: "1m" },
  { id: "5", connectorId: "plaid-1", connectorName: "Plaid - Chase", status: "failed", startedAt: "2024-12-14T10:30:00Z", completedAt: "2024-12-14T10:30:05Z", recordCount: 0, error: "Connection timeout", duration: "5s" },
  { id: "6", connectorId: "plaid-1", connectorName: "Plaid - Chase", status: "success", startedAt: "2024-12-13T10:30:00Z", completedAt: "2024-12-13T10:31:00Z", recordCount: 280, error: null, duration: "1m" },
]

export function SyncHistory() {
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = statusFilter === "all"
    ? mockHistory
    : mockHistory.filter(h => h.status === statusFilter)

  return (
    <Card className="shadow-sm border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">Sync History</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All</SelectItem>
              <SelectItem value="success" className="text-xs">Success</SelectItem>
              <SelectItem value="failed" className="text-xs">Failed</SelectItem>
              <SelectItem value="partial" className="text-xs">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Source</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Started</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Duration</TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Records</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                  <TableCell className="font-medium text-foreground/80 py-2">{item.connectorName}</TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant="outline"
                      className={
                        item.status === "success" ? "bg-green-50 text-green-600 text-[10px]"
                        : item.status === "failed" ? "bg-red-50 text-red-600 text-[10px]"
                        : item.status === "partial" ? "bg-amber-50 text-amber-600 text-[10px]"
                        : "bg-blue-50 text-blue-600 text-[10px]"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2">
                    {new Date(item.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2">{item.duration || "-"}</TableCell>
                  <TableCell className="text-right text-foreground font-medium py-2">
                    {item.recordCount?.toLocaleString() || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2 max-w-[200px] truncate">
                    {item.error || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
