"use client"

import { useDashboardView, type DashboardSubView } from "@/lib/store/dashboard-view"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  Wallet,
  PieChart,
  Target,
  Repeat,
  BarChart3,
  Briefcase,
} from "lucide-react"

const dashboardViews: { value: DashboardSubView; label: string; icon: any }[] = [
  { value: "budget-summary", label: "Budget Summary", icon: LayoutDashboard },
  { value: "overview", label: "Overview", icon: BarChart3 },
  { value: "cash-positioning", label: "Cash Positioning", icon: Wallet },
  { value: "cash-flow", label: "Cash Flow Analysis", icon: TrendingUp },
  { value: "spending-analysis", label: "Spending Analysis", icon: PieChart },
  { value: "income-analysis", label: "Income Analysis", icon: DollarSign },
  { value: "budget-management", label: "Budget Management", icon: Target },
  { value: "recurring-transactions", label: "Recurring Transactions", icon: Repeat },
  { value: "financial-goals", label: "Financial Goals", icon: Target },
  { value: "investment-portfolio", label: "Investment Portfolio", icon: Briefcase },
]

export function DashboardSubviewSelector() {
  const { currentSubView, setSubView } = useDashboardView()

  return (
    <div className="border-b bg-card px-6 py-2">
      <Select value={currentSubView} onValueChange={(v) => setSubView(v as DashboardSubView)}>
        <SelectTrigger className="w-[220px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dashboardViews.map((view) => {
            const Icon = view.icon
            return (
              <SelectItem key={view.value} value={view.value}>
                <div className="flex items-center gap-2">
                  <Icon className="size-4" />
                  <span>{view.label}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
