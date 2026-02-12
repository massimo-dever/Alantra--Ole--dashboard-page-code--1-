import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  change: string
  trend: "up" | "down"
}

export function MetricCard({ title, value, change, trend }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h3>
        <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
        {change && (
          <div
            className={cn(
              "text-xs font-medium flex items-center gap-1",
              trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
            )}
          >
            {trend === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            <span>{change}%</span>
            <span className="text-muted-foreground font-normal">YoY</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
