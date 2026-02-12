"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { name: "Jan 24", sales: 120, product: 150, marketing: 80, hr: 40, finance: 30, eng: 180, support: 60 },
  { name: "Feb 24", sales: 130, product: 160, marketing: 85, hr: 42, finance: 32, eng: 185, support: 65 },
  { name: "Mar 24", sales: 150, product: 180, marketing: 95, hr: 45, finance: 35, eng: 200, support: 70 },
  { name: "Apr 24", sales: 140, product: 170, marketing: 90, hr: 43, finance: 33, eng: 190, support: 68 },
  { name: "May 24", sales: 145, product: 175, marketing: 92, hr: 44, finance: 34, eng: 195, support: 69 },
  { name: "Jun 24", sales: 148, product: 178, marketing: 94, hr: 44, finance: 34, eng: 198, support: 69 },
  { name: "Jul 24", sales: 200, product: 220, marketing: 120, hr: 55, finance: 45, eng: 250, support: 90 },
  { name: "Aug 24", sales: 220, product: 240, marketing: 130, hr: 60, finance: 50, eng: 270, support: 100 },
  { name: "Sep 24", sales: 210, product: 230, marketing: 125, hr: 58, finance: 48, eng: 260, support: 95 },
  { name: "Oct 24", sales: 240, product: 260, marketing: 140, hr: 65, finance: 55, eng: 290, support: 110 },
]

const colors = {
  support: "#6366f1",
  eng: "#3b82f6",
  finance: "#8b5cf6",
  hr: "#ec4899",
  marketing: "#f97316",
  product: "#f59e0b",
  sales: "#10b981",
}

export function TrendedOpexChart() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Trended OPEX by Department</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                className="fill-muted-foreground text-[11px]"
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                className="fill-muted-foreground text-[11px]"
                tickFormatter={(value) => `${value / 1000}M`}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                  color: "hsl(var(--card-foreground))",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend
                verticalAlign="top"
                align="left"
                iconType="square"
                iconSize={8}
                wrapperStyle={{ paddingBottom: "20px", fontSize: "10px" }}
              />
              <Bar dataKey="support" stackId="a" fill={colors.support} name="Customer Support" />
              <Bar dataKey="eng" stackId="a" fill={colors.eng} name="Engineering" />
              <Bar dataKey="finance" stackId="a" fill={colors.finance} name="Finance" />
              <Bar dataKey="hr" stackId="a" fill={colors.hr} name="HR" />
              <Bar dataKey="marketing" stackId="a" fill={colors.marketing} name="Marketing" />
              <Bar dataKey="product" stackId="a" fill={colors.product} name="Product" />
              <Bar dataKey="sales" stackId="a" fill={colors.sales} name="Sales" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
