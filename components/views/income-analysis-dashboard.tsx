"use client"

import { useDashboardData } from "@/hooks/use-dashboard-data"
import { DashboardLoading } from "@/components/dashboard-loading"
import { MockDataBanner } from "@/components/mock-data-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts"

interface IncomeData {
  incomeBySource: { name: string; value: number; color: string }[]
  monthlyIncome: { month: string; amount: number }[]
  ytdIncome: { period: string; amount: number }[]
  incomeSources: { source: string; monthly: number; ytd: number; growth: string; recurring: boolean }[]
  isMockData?: boolean
}

export function IncomeAnalysisDashboard() {
  const { data, isLoading, isMockData } = useDashboardData<IncomeData>("income-analysis")

  if (isLoading || !data) return <DashboardLoading />

  const { incomeBySource, monthlyIncome, ytdIncome, incomeSources } = data

  return (
    <div className="flex-1 overflow-auto p-6">
      <MockDataBanner visible={isMockData} />

      <div className="grid grid-cols-12 gap-6 mb-6 mt-4">
        <div className="col-span-12 lg:col-span-6">
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Income by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomeBySource} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {incomeBySource.map((entry, index) => (
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
              <CardTitle className="text-sm font-semibold text-foreground">Monthly Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyIncome}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} tickFormatter={(value) => `$${value / 1000}K`} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                    <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm border-border mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">YTD Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ytdIncome}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} tickFormatter={(value) => `$${value / 1000}K`} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-2))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Income Sources</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Source</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Monthly</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">YTD</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Growth Rate</TableHead>
                  <TableHead className="text-center text-xs font-medium text-muted-foreground h-9">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeSources.map((source, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                    <TableCell className="font-medium text-foreground/80 py-2">{source.source}</TableCell>
                    <TableCell className="text-right text-foreground font-medium py-2">${(source.monthly / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right text-foreground font-medium py-2">${(source.ytd / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right text-green-600 font-medium py-2">{source.growth}</TableCell>
                    <TableCell className="text-center py-2">
                      {source.recurring ? (
                        <Badge variant="default" className="bg-green-100 text-green-700">Recurring</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">One-time</Badge>
                      )}
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
