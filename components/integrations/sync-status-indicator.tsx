"use client"

import { RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface SyncStatus {
  status: "idle" | "syncing" | "success" | "error"
  lastSyncTime: string
  syncSource: string
  accountsSynced: number
  transactionsSynced: number
  timeSinceSyncMinutes: number
}

const mockStatus: SyncStatus = {
  status: "success",
  lastSyncTime: "2024-12-15T10:30:00Z",
  syncSource: "Plaid",
  accountsSynced: 6,
  transactionsSynced: 1250,
  timeSinceSyncMinutes: 45,
}

export function SyncStatusIndicator() {
  const [syncing, setSyncing] = useState(false)
  const status = mockStatus

  const handleSync = async () => {
    setSyncing(true)
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000))
    setSyncing(false)
  }

  const statusConfig = {
    idle: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: "Idle" },
    syncing: { icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50", label: "Syncing..." },
    success: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Up to date" },
    error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Sync failed" },
  }

  const currentStatus = syncing ? statusConfig.syncing : statusConfig[status.status]
  const StatusIcon = currentStatus.icon

  return (
    <Card className="shadow-sm border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">Sync Status</CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-transparent" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`size-10 rounded-full flex items-center justify-center ${currentStatus.bg}`}>
            <StatusIcon className={`size-5 ${currentStatus.color} ${syncing ? "animate-spin" : ""}`} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${currentStatus.color}`}>{currentStatus.label}</p>
            <p className="text-xs text-muted-foreground">
              Last sync: {status.timeSinceSyncMinutes} min ago via {status.syncSource}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
          <div>
            <p className="text-lg font-semibold text-foreground">{status.accountsSynced}</p>
            <p className="text-[10px] text-muted-foreground">Accounts Synced</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{status.transactionsSynced.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Transactions Synced</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{status.timeSinceSyncMinutes}m</p>
            <p className="text-[10px] text-muted-foreground">Since Last Sync</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
