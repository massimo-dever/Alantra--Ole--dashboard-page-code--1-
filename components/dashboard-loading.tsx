"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardLoading() {
  return (
    <div className="flex-1 overflow-auto p-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="shadow-sm border-border">
            <CardContent className="p-5">
              <div className="h-3 w-24 bg-muted rounded mb-3" />
              <div className="h-7 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="shadow-sm border-border mb-6">
        <CardHeader>
          <div className="h-4 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[350px] bg-muted/50 rounded" />
        </CardContent>
      </Card>
    </div>
  )
}
