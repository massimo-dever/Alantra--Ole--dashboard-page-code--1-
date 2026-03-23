"use client"

import { useMemo } from "react"
import { transformPlaidData } from "@/lib/plaidTransformer"
import { calculateCashFlowData } from "@/lib/dashboardCalculations"
import { MetricCard } from "@/components/charts/metric-card"
import plaidData from "@/data/plaid_api_response.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts"

interface CashFlowData {
  kpis: {
    netCashFlow: number
    totalInflow: number
    totalOutflow: number
    operatingMargin: number
    monthOverMonth: number
    projectedRunway: number
  }
  monthlyCashFlow: { month: string; inflow: number; outflow: number; net: number }[]
  waterfallData: { name: string; value: number; fill: string }[]
  categoryBreakdown: { category: string; amount: number; percentage: number; type: "inflow" | "outflow" }[]
}

export function CashFlowDashboard() {
  const data = useMemo(() => {
    const { transactions, accounts } = transformPlaidData(plaidData)
    return calculateCashFlowData(transactions, accounts)
  }, [])

  if (!data) return null

  const { kpis, monthlyCashFlow, waterfallData, categoryBreakdown } = data

  const cumulativeData = monthlyCashFlow.reduce<{ month: string; cumulative: number }[]>((acc, item) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0
    acc.push({ month: item.month, cumulative: prev + item.net })
    return acc
  }, [])

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 mt-4">
        <MetricCard
          title="Net Cash Flow"
          value={`$${(kpis.netCashFlow / 1000).toFixed(0)}K`}
          change={`+${kpis.monthOverMonth}`}
          trend="up"
        />
        <MetricCard
          title="Total Inflow"
          value={`$${(kpis.totalInflow / 1000000).toFixed(1)}M`}
          change=""
          trend="up"
        />
        <MetricCard
          title="Total Outflow"
          value={`$${(kpis.totalOutflow / 1000000).toFixed(1)}M`}
          change=""
          trend="down"
        />
        <MetricCard
          title="Operating Margin"
          value={`${kpis.operatingMargin}%`}
          change=""
          trend="up"
        />
        <MetricCard
          title="MoM Change"
          value={`+${kpis.monthOverMonth}%`}
          change=""
          trend="up"
        />
        <MetricCard
          title="Projected Runway"
          value={`${kpis.projectedRunway} mo`}
          change=""
          trend="up"
        />
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Monthly Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyCashFlow} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      className="fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      className="fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${value / 1000}K`}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        color: "hsl(var(--card-foreground))",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
                    />
                    <Legend
                      verticalAlign="top"
                      align="left"
                      iconType="square"
                      iconSize={8}
                      wrapperStyle={{ paddingBottom: "20px", fontSize: "10px" }}
                    />
                    <Bar dataKey="inflow" fill="hsl(var(--chart-2))" name="Inflow" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outflow" fill="hsl(var(--chart-5))" name="Outflow" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net" fill="hsl(var(--chart-1))" name="Net" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Cumulative Net Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      className="fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      className="fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${value / 1000}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        color: "hsl(var(--card-foreground))",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Category</TableHead>
                  <TableHead className="text-center text-xs font-medium text-muted-foreground h-9">Type</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Amount</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryBreakdown.map((item, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                    <TableCell className="font-medium text-foreground py-2.5">{item.category}</TableCell>
                    <TableCell className="text-center py-2.5">
                      <Badge
                        variant="outline"
                        className={
                          item.type === "inflow"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-[10px]"
                            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400 text-[10px]"
                        }
                      >
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground font-medium py-2.5">
                      ${(item.amount / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground py-2.5">{item.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
