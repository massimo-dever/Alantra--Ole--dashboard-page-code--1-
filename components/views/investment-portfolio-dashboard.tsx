"use client"

import { useMemo } from "react"
import { transformPlaidData } from "@/lib/plaidTransformer"
import { calculateInvestmentPortfolioData } from "@/lib/dashboardCalculations2"
import { MetricCard } from "@/components/charts/metric-card"
import plaidData from "@/data/plaid_api_response.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts"

interface InvestmentData {
  kpis: {
    totalValue: number
    dayChange: number
    dayChangePercent: number
    totalReturn: number
    totalReturnPercent: number
    dividendYield: number
  }
  assetAllocation: { name: string; value: number; color: string }[]
  portfolioHistory: { date: string; value: number }[]
  holdings: { ticker: string; name: string; quantity: number; costBasis: number; currentPrice: number; pnl: number; dayChange: number }[]
}

export function InvestmentPortfolioDashboard() {
  const data = useMemo(() => {
    const { accounts } = transformPlaidData(plaidData)
    return calculateInvestmentPortfolioData(accounts)
  }, [])

  if (!data) return null

  const { kpis, assetAllocation, portfolioHistory, holdings } = data

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 mt-4">
        <MetricCard
          title="Total Portfolio Value"
          value={`$${(kpis.totalValue / 1000000).toFixed(2)}M`}
          change={`${kpis.dayChangePercent >= 0 ? "+" : ""}${kpis.dayChangePercent.toFixed(2)}`}
          trend={kpis.dayChangePercent >= 0 ? "up" : "down"}
        />
        <MetricCard
          title="Day Change"
          value={`${kpis.dayChange >= 0 ? "+" : ""}$${(Math.abs(kpis.dayChange) / 1000).toFixed(1)}K`}
          change=""
          trend={kpis.dayChange >= 0 ? "up" : "down"}
        />
        <MetricCard
          title="Total Return"
          value={`$${(kpis.totalReturn / 1000).toFixed(0)}K`}
          change={`+${kpis.totalReturnPercent}`}
          trend="up"
        />
        <MetricCard
          title="Return %"
          value={`${kpis.totalReturnPercent}%`}
          change=""
          trend="up"
        />
        <MetricCard
          title="Dividend Yield"
          value={`${kpis.dividendYield}%`}
          change=""
          trend="up"
        />
        <MetricCard
          title="Holdings"
          value={String(holdings.length)}
          change=""
          trend="up"
        />
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Portfolio Value Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      className="fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${value / 1000000}M`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={115}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                    >
                      {assetAllocation.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
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
          <CardTitle className="text-sm font-semibold text-foreground">Holdings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Ticker</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Name</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Qty</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Cost Basis</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Current</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">P&L</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Day Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className="font-mono text-[10px] font-semibold">{h.ticker}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground py-2.5">{h.name}</TableCell>
                    <TableCell className="text-right text-foreground/80 py-2.5">{h.quantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground py-2.5">${h.costBasis.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-foreground font-medium py-2.5">${h.currentPrice.toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-medium py-2.5 ${h.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {h.pnl >= 0 ? "+" : ""}${h.pnl.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-medium py-2.5 ${h.dayChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {h.dayChange >= 0 ? "+" : ""}{h.dayChange.toFixed(2)}%
                    </TableCell>
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
