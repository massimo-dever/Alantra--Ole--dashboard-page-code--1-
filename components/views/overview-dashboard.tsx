"use client"

import { useDashboardData } from "@/hooks/use-dashboard-data"
import { MetricCard } from "@/components/charts/metric-card"
import { DashboardLoading } from "@/components/dashboard-loading"
import { MockDataBanner } from "@/components/mock-data-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts"

interface OverviewData {
  monthlyData: { month: string; revenue: number; expenses: number; netIncome: number }[]
  kpis: {
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    avgMonthlyExpenses: number
    runway: number
    savingsRate: number
    activeAccounts: number
    monthlyGrowth: number
    lastRefresh: string
  }
  isMockData?: boolean
}

export function OverviewDashboard() {
  const { data, isLoading, isMockData } = useDashboardData<OverviewData>("overview")

  if (isLoading || !data) return <DashboardLoading />

  const { monthlyData, kpis } = data

  return (
    <div className="flex-1 overflow-auto p-6">
      <MockDataBanner visible={isMockData} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 mt-4">
        <MetricCard
          title="Total Revenue (L12M)"
          value={`$${(kpis.totalRevenue / 1000000).toFixed(1)}M`}
          change={`+${kpis.monthlyGrowth}`}
          trend="up"
        />
        <MetricCard
          title="Total Expenses (L12M)"
          value={`$${(kpis.totalExpenses / 1000000).toFixed(1)}M`}
          change="+8.3"
          trend="up"
        />
        <MetricCard
          title="Net Income"
          value={`$${(kpis.netIncome / 1000000).toFixed(1)}M`}
          change="+28.5"
          trend="up"
        />
        <MetricCard
          title="Monthly Burn Rate"
          value={`$${(kpis.avgMonthlyExpenses / 1000).toFixed(0)}K`}
          change="Avg"
          trend="up"
        />
        <MetricCard title="Runway" value={`${kpis.runway} months`} change="" trend="up" />
        <MetricCard title="Savings Rate" value={`${kpis.savingsRate}%`} change="" trend="up" />
      </div>

      <Card className="shadow-sm border-border mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Revenue vs Expenses vs Net Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  className="fill-muted-foreground"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `$${value / 1000}K`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Legend
                  verticalAlign="top"
                  align="left"
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: "20px", fontSize: "10px" }}
                />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stackId="1" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.6} name="Expenses" />
                <Area type="monotone" dataKey="netIncome" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.4} name="Net Income" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
