"use client"

import { useState, useMemo } from "react"
import { transformPlaidData } from "@/lib/plaidTransformer"
import { generateDashboardData } from "@/lib/aggregatedInsights"
import { metricToPivot } from "@/lib/metricPivotMap"
import PivotPopover from "@/components/PivotPopover"
import plaidData from "@/data/plaid_api_response.json"

const pivotTitles: Record<string, string> = {
  category: "Monthly Totals by Category",
  vendor: "Monthly Spend by Vendor",
  customer: "Monthly Revenue by Customer",
  cashFlow: "Cash Flow by Account",
}

export function HomeDashboard() {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)

  const dashboardData = useMemo(() => {
    const { transactions, accounts, customers, vendors } = transformPlaidData(plaidData)
    return generateDashboardData(transactions, accounts, customers, vendors)
  }, [])

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
        Dashboard Summary
      </h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ padding: "8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Metric</th>
            <th style={{ padding: "8px", textAlign: "right", borderBottom: "2px solid #ddd" }}>Value</th>
            <th style={{ padding: "8px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {dashboardData.summaryStats.map((row) => {
            const pivotKey = metricToPivot[row.metric]
            const isHovered = hoveredMetric === row.metric

            return (
              <tr
                key={row.metric}
                style={{
                  position: "relative",
                  cursor: pivotKey ? "pointer" : "default",
                  borderBottom: "1px solid #eee",
                }}
                onMouseEnter={() => setHoveredMetric(row.metric)}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <td style={{ padding: "8px" }}>{row.metric}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  {typeof row.value === "number"
                    ? row.value.toLocaleString()
                    : row.value}
                </td>
                <td style={{ padding: "8px", position: "relative" }}>
                  {row.description}
                  {pivotKey && isHovered && (
                    <PivotPopover
                      pivot={
                        dashboardData.pivotTables[
                          pivotKey as keyof typeof dashboardData.pivotTables
                        ]
                      }
                      title={pivotTitles[pivotKey]}
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
