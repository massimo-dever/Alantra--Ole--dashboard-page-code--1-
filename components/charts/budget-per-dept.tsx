"use client"

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { name: "Sales", value: 2.5 },
  { name: "Product", value: 2.0 },
  { name: "Marketing", value: 1.5 },
  { name: "HR", value: 1.0 },
  { name: "Finance", value: 0.8 },
  { name: "Eng", value: 0.5 },
]

export function BudgetPerDeptChart() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground">Total Budget per Department</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barSize={12}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                width={1}
                tick={{ fill: "transparent" }}
              />
              <Bar dataKey="value" fill="#be185d" radius={[0, 4, 4, 0]} background={{ fill: "hsl(var(--muted))" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="size-2 bg-[#1e1b4b] rounded-sm" />Customer Support
          </div>
          <div className="flex items-center gap-1">
            <div className="size-2 bg-[#be185d] rounded-sm" />HR
          </div>
          <div className="flex items-center gap-1">
            <div className="size-2 bg-[#fb923c] rounded-sm" />Product
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
