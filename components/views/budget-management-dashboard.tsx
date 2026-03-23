"use client"

import { useMemo } from "react"
import { transformPlaidData } from "@/lib/plaidTransformer"
import { calculateBudgetManagementData } from "@/lib/dashboardCalculations2"
import { MetricCard } from "@/components/charts/metric-card"
import plaidData from "@/data/plaid_api_response.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"

interface BudgetManagementData {
  kpis: {
    totalBudget: number
    totalActual: number
    totalVariance: number
    variancePercent: number
    utilizationRate: number
    categoriesOverBudget: number
    categoriesUnderBudget: number
  }
  budgetByCategory: { category: string; budget: number; actual: number; variance: number }[]
  monthlyBudgetTrend: { month: string; budget: number; actual: number }[]
  departmentAllocation: { name: string; value: number; color: string }[]
}

export function BudgetManagementDashboard() {
  const data = useMemo(() => {
    const { transactions, vendors } = transformPlaidData(plaidData)
    return calculateBudgetManagementData(transactions, vendors)
  }, [])

  if (!data) return null

  const { kpis, budgetByCategory, monthlyBudgetTrend, departmentAllocation } = data

  const getVarianceBadge = (variance: number, budget: number) => {
    const pct = Math.abs((variance / budget) * 100)
    if (variance > 0) {
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-[10px] font-medium">
          Over +{pct.toFixed(1)}%
        </Badge>
      )
    }
    if (pct < 2) {
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-medium">
          Near Limit
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-medium">
        Under -{pct.toFixed(1)}%
      </Badge>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-4">
        <MetricCard
          title="Total Budget"
          value={`$${(kpis.totalBudget / 1000000).toFixed(1)}M`}
          change=""
          trend="up"
        />
        <MetricCard
          title="Total Actual"
          value={`$${(kpis.totalActual / 1000000).toFixed(1)}M`}
          change={`${kpis.variancePercent > 0 ? "+" : ""}${kpis.variancePercent.toFixed(1)}`}
          trend={kpis.totalVariance <= 0 ? "down" : "up"}
        />
        <MetricCard
          title="Utilization Rate"
          value={`${kpis.utilizationRate.toFixed(1)}%`}
          change=""
          trend="up"
        />
        <MetricCard
          title="Over Budget"
          value={`${kpis.categoriesOverBudget} of ${kpis.categoriesOverBudget + kpis.categoriesUnderBudget}`}
          change=""
          trend={kpis.categoriesOverBudget > 0 ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Budget vs Actual (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBudgetTrend} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(v) => `$${v / 1000}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
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
                    <Bar dataKey="budget" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Budget" />
                    <Bar dataKey="actual" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Budget Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={115}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                    >
                      {departmentAllocation.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Budget Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Category</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Budget</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Actual</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Variance</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Used</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetByCategory.map((item, i) => {
                  const pct = (item.actual / item.budget) * 100
                  return (
                    <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                      <TableCell className="font-medium text-foreground py-2.5">{item.category}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2.5">
                        ${(item.budget / 1000).toFixed(0)}K
                      </TableCell>
                      <TableCell className="text-right text-foreground font-medium py-2.5">
                        ${(item.actual / 1000).toFixed(0)}K
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium py-2.5 ${item.variance > 0 ? "text-red-600" : "text-emerald-600"}`}
                      >
                        {item.variance > 0 ? "+" : ""}${(item.variance / 1000).toFixed(0)}K
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct > 100 ? "bg-red-500" : pct > 90 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        {getVarianceBadge(item.variance, item.budget)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
