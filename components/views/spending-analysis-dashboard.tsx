"use client"

import { useMemo } from "react"
import { transformPlaidData } from "@/lib/plaidTransformer"
import { calculateSpendingAnalysisData } from "@/lib/dashboardCalculations"
import { MetricCard } from "@/components/charts/metric-card"
import plaidData from "@/data/plaid_api_response.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

interface SpendingData {
  spendingByCategory: { name: string; value: number; color: string }[]
  monthlySpending: { month: string; amount: number }[]
  topMerchants: { merchant: string; category: string; amount: number; budget: number; variance: string }[]
  kpis: { totalSpend: number; change: number; avgDailySpend: number }
}

export function SpendingAnalysisDashboard() {
  const data = useMemo(() => {
    const { transactions, vendors } = transformPlaidData(plaidData)
    return calculateSpendingAnalysisData(transactions, vendors)
  }, [])

  if (!data) return null

  const { spendingByCategory, monthlySpending, topMerchants, kpis } = data

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
        <MetricCard title="Total Spend" value={`$${(kpis.totalSpend / 1000).toFixed(0)}K`} change={`+${kpis.change.toFixed(1)}`} trend="up" />
        <MetricCard title="Change vs Previous Period" value={`+${kpis.change.toFixed(1)}%`} change="" trend="up" />
        <MetricCard title="Average Daily Spend" value={`$${(kpis.avgDailySpend / 1000).toFixed(1)}K`} change="" trend="up" />
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-6">
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={spendingByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {spendingByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Monthly Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySpending}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} tickFormatter={(value) => `$${value / 1000}K`} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                    <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Top Merchants by Spend</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Merchant</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Category</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Amount</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Budget</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topMerchants.map((m, i) => {
                  const isOver = Number.parseFloat(m.variance) > 0
                  return (
                    <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                      <TableCell className="font-medium text-foreground/80 py-2">{m.merchant}</TableCell>
                      <TableCell className="text-foreground/80 py-2">{m.category}</TableCell>
                      <TableCell className="text-right text-foreground font-medium py-2">${(m.amount / 1000).toFixed(0)}K</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">${(m.budget / 1000).toFixed(0)}K</TableCell>
                      <TableCell className={`text-right font-medium py-2 ${isOver ? "text-red-600" : "text-green-600"}`}>{m.variance}</TableCell>
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
