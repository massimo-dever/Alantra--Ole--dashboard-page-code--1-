"use client"

import { useMemo } from "react"
import { transformPlaidData } from "@/lib/plaidTransformer"
import { calculateRecurringTransactionsData } from "@/lib/dashboardCalculations2"
import { MetricCard } from "@/components/charts/metric-card"
import plaidData from "@/data/plaid_api_response.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts"

interface RecurringData {
  kpis: {
    totalMonthlyRecurring: number
    salariesTotal: number
    subscriptionsTotal: number
    otherTotal: number
    changeVsPrior: number
    upcomingRenewals: number
  }
  salariesData: { employee: string; department: string; base: number; bonus: number; benefits: number; total: number }[]
  subscriptionsData: { vendor: string; category: string; perUser: number; monthly: number; renewalDate: string }[]
  otherRecurring: { item: string; category: string; amount: number; frequency: string }[]
  costBreakdown: { name: string; value: number; color: string }[]
  monthlyTrend: { month: string; amount: number }[]
}

export function RecurringTransactionsDashboard() {
  const data = useMemo(() => {
    const { transactions, vendors } = transformPlaidData(plaidData)
    return calculateRecurringTransactionsData(transactions, vendors)
  }, [])

  if (!data) return null

  const { kpis, salariesData, subscriptionsData, otherRecurring, costBreakdown, monthlyTrend } = data

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 mt-4">
        <MetricCard
          title="Total Monthly Recurring"
          value={`$${(kpis.totalMonthlyRecurring / 1000).toFixed(0)}K`}
          change={`+${kpis.changeVsPrior}`}
          trend="up"
        />
        <MetricCard title="Salaries" value={`$${(kpis.salariesTotal / 1000).toFixed(0)}K`} change="" trend="up" />
        <MetricCard title="Subscriptions" value={`$${(kpis.subscriptionsTotal / 1000).toFixed(0)}K`} change="" trend="up" />
        <MetricCard title="Other Recurring" value={`$${(kpis.otherTotal / 1000).toFixed(0)}K`} change="" trend="up" />
        <MetricCard title="MoM Change" value={`+${kpis.changeVsPrior}%`} change="" trend="up" />
        <MetricCard title="Upcoming Renewals" value={String(kpis.upcomingRenewals)} change="" trend="up" />
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Recurring Cost Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}K`} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`}
                    />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                    >
                      {costBreakdown.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm border-border mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Salaries & Payroll</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Employee</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Department</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Base Salary</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Bonus</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Benefits</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salariesData.map((salary, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                    <TableCell className="font-medium text-foreground py-2.5">{salary.employee}</TableCell>
                    <TableCell className="text-foreground/80 py-2.5">
                      <Badge variant="outline" className="text-[10px] font-medium">{salary.department}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground/80 py-2.5">${(salary.base / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right text-foreground/80 py-2.5">${(salary.bonus / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right text-foreground/80 py-2.5">${(salary.benefits / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right text-foreground font-semibold py-2.5">${(salary.total / 1000).toFixed(0)}K</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Tools & Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Vendor</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Category</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Per User Cost</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Monthly Cost</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Renewal Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionsData.map((sub, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                    <TableCell className="font-medium text-foreground py-2.5">{sub.vendor}</TableCell>
                    <TableCell className="text-foreground/80 py-2.5">
                      <Badge variant="outline" className="text-[10px] font-medium">{sub.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground/80 py-2.5">
                      {sub.perUser > 0 ? `$${sub.perUser}/user` : "Flat rate"}
                    </TableCell>
                    <TableCell className="text-right text-foreground font-medium py-2.5">${(sub.monthly / 1000).toFixed(1)}K</TableCell>
                    <TableCell className="text-muted-foreground py-2.5">{sub.renewalDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Other Recurring Expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Item</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Category</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Amount</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Frequency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherRecurring.map((item, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                    <TableCell className="font-medium text-foreground py-2.5">{item.item}</TableCell>
                    <TableCell className="text-foreground/80 py-2.5">
                      <Badge variant="outline" className="text-[10px] font-medium">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground font-medium py-2.5">${(item.amount / 1000).toFixed(1)}K</TableCell>
                    <TableCell className="text-muted-foreground py-2.5">{item.frequency}</TableCell>
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
