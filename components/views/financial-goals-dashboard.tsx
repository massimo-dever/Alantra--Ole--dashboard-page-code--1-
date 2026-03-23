"use client"

import { useState, useMemo } from "react"
import { transformPlaidData } from "@/lib/plaidTransformer"
import { calculateFinancialGoalsData } from "@/lib/dashboardCalculations2"
import { MetricCard } from "@/components/charts/metric-card"
import plaidData from "@/data/plaid_api_response.json"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

interface GoalItem {
  id: number
  name: string
  target: number
  current: number
  targetDate: string
  status: string
  history: { date: string; value: number }[]
}

interface FinancialGoalsData {
  kpis: {
    totalGoals: number
    onTrack: number
    atRisk: number
    overallProgress: number
    totalTargetValue: number
    totalCurrentValue: number
  }
  goals: GoalItem[]
}

export function FinancialGoalsDashboard() {
  const [selectedGoalId, setSelectedGoalId] = useState<number>(1)

  const data = useMemo(() => {
    const { transactions } = transformPlaidData(plaidData)
    return calculateFinancialGoalsData(transactions)
  }, [])

  if (!data) return null

  const { kpis, goals } = data
  const selectedGoal = goals.find((g) => g.id === selectedGoalId) || goals[0]

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 mt-4">
        <MetricCard title="Total Goals" value={String(kpis.totalGoals)} change="" trend="up" />
        <MetricCard title="On Track" value={String(kpis.onTrack)} change="" trend="up" />
        <MetricCard title="At Risk" value={String(kpis.atRisk)} change="" trend={kpis.atRisk > 0 ? "down" : "up"} />
        <MetricCard title="Overall Progress" value={`${kpis.overallProgress}%`} change="" trend="up" />
        <MetricCard title="Target Value" value={`$${(kpis.totalTargetValue / 1000000).toFixed(2)}M`} change="" trend="up" />
        <MetricCard title="Current Value" value={`$${(kpis.totalCurrentValue / 1000).toFixed(0)}K`} change="" trend="up" />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Financial Goals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      <TableHead className="text-xs font-medium text-muted-foreground h-9">Goal</TableHead>
                      <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Progress</TableHead>
                      <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">Target</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground h-9">Due</TableHead>
                      <TableHead className="text-center text-xs font-medium text-muted-foreground h-9">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals.map((goal) => {
                      const progress = (goal.current / goal.target) * 100
                      return (
                        <TableRow
                          key={goal.id}
                          className={`hover:bg-muted/50 border-b border-border/30 text-xs cursor-pointer transition-colors ${
                            selectedGoalId === goal.id ? "bg-accent" : ""
                          }`}
                          onClick={() => setSelectedGoalId(goal.id)}
                        >
                          <TableCell className="font-medium text-foreground py-2.5">
                            <div className="flex flex-col gap-1">
                              <span>{goal.name}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${progress > 80 ? "bg-emerald-500" : progress > 50 ? "bg-amber-500" : "bg-red-500"}`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                                <span className="text-muted-foreground text-[10px]">{progress.toFixed(0)}%</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-foreground font-medium py-2.5">
                            ${(goal.current / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground py-2.5">
                            ${(goal.target / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell className="text-muted-foreground py-2.5">{goal.targetDate}</TableCell>
                          <TableCell className="text-center py-2.5">
                            <Badge
                              variant="outline"
                              className={
                                goal.status === "on-track"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 text-[10px]"
                                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400 text-[10px]"
                              }
                            >
                              {goal.status === "on-track" ? "On Track" : "At Risk"}
                            </Badge>
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

        <div className="col-span-12 lg:col-span-6">
          <Card className="shadow-sm border-border h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">
                Progress: {selectedGoal.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedGoal.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      className="fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${value / 1000}K`}
                    />
                    <ReferenceLine
                      y={selectedGoal.target}
                      stroke="hsl(var(--chart-5))"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{ value: "Target", position: "insideTopRight", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
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
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ fill: "hsl(var(--chart-1))", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Progress</span>
                  <span className="font-medium text-foreground">
                    ${(selectedGoal.current / 1000).toFixed(0)}K / ${(selectedGoal.target / 1000).toFixed(0)}K
                  </span>
                </div>
                <Progress value={(selectedGoal.current / selectedGoal.target) * 100} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{((selectedGoal.current / selectedGoal.target) * 100).toFixed(1)}% complete</span>
                  <span>Due: {selectedGoal.targetDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
