"use client"

import { useDashboardData } from "@/hooks/use-dashboard-data"
import { DashboardLoading } from "@/components/dashboard-loading"
import { MockDataBanner } from "@/components/mock-data-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts"

interface CashPositioningData {
  cashBalanceData: { date: string; balance: number }[]
  entityBreakdown: { name: string; value: number; color: string }[]
  accountsData: { name: string; entity: string; type: string; currency: string; amount: number; lastUpdated: string }[]
  isMockData?: boolean
}

export function CashPositioningDashboard() {
  const { data, isLoading, isMockData } = useDashboardData<CashPositioningData>("cash-positioning")

  if (isLoading || !data) return <DashboardLoading />

  const { cashBalanceData, entityBreakdown, accountsData } = data

  return (
    <div className="flex-1 overflow-auto p-6">
      <MockDataBanner visible={isMockData} />

      <div className="grid grid-cols-12 gap-6 mb-6 mt-4">
        <div className="col-span-12 lg:col-span-8">
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Total Cash Balance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashBalanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} tickFormatter={(value) => `$${value / 1000000}M`} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`} />
                    <Area type="monotone" dataKey="balance" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Breakdown by Entity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={entityBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {entityBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Account Name</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Entity</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Type</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Currency</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Amount</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsData.map((account, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                    <TableCell className="font-medium text-foreground/80 py-2">{account.name}</TableCell>
                    <TableCell className="text-foreground/80 py-2">{account.entity}</TableCell>
                    <TableCell className="text-foreground/80 py-2">{account.type}</TableCell>
                    <TableCell className="text-foreground/80 py-2">{account.currency}</TableCell>
                    <TableCell className="text-right text-foreground font-medium py-2">${(account.amount / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-muted-foreground py-2">{account.lastUpdated}</TableCell>
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
