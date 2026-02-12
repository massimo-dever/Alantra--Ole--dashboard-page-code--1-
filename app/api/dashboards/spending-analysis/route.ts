import { NextRequest, NextResponse } from "next/server"
import { parseDashboardQuery } from "@/lib/validations/dashboard-query"
import { getSpendingAnalysisData } from "@/lib/mock-data/dashboards/spending-analysis"

export async function GET(request: NextRequest) {
  try {
    const params = parseDashboardQuery(request.nextUrl.searchParams)
    const data = getSpendingAnalysisData()
    return NextResponse.json({ ...data, filters: params })
  } catch (error) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 })
  }
}
