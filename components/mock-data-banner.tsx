"use client"

import { AlertTriangle } from "lucide-react"

export function MockDataBanner({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
      <AlertTriangle className="size-3.5 flex-shrink-0" />
      <span className="font-medium">Demo Mode</span>
      <span className="text-amber-700 dark:text-amber-300">
        Displaying sample data. Connect a data source in Settings to see real numbers.
      </span>
    </div>
  )
}
