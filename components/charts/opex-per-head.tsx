"use client"

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { name: "Jan", value: 1940 },
  { name: "Feb", value: 2382 },
  { name: "Mar", value: 2754 },
  { name: "Apr", value: 2367 },
  { name: "May", value: 2571 },
  { name: "Jun", value: 2464 },
  { name: "Jul", value: 3595 },
  { name: "Aug", value: 3944 },
  { name: "Sep", value: 3736 },
  { name: "Oct", value: 4340 },
  { name: "Nov", value: 3531 },
  { name: "Dec", value: 3923 },
]

export function OpexPerHeadChart() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground">OPEX per Head</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} barSize={8}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
                interval={2}
              />
              <YAxis hide />
              <Bar dataKey="value" fill="#1e1b4b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
