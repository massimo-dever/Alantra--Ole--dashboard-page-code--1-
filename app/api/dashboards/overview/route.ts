import { NextRequest, NextResponse } from "next/server"
import { parseDashboardQuery } from "@/lib/validations/dashboard-query"
import { getOverviewData } from "@/lib/mock-data/dashboards/overview"

export async function GET(request: NextRequest) {
  try {
    const params = parseDashboardQuery(request.nextUrl.searchParams)
    const data = getOverviewData()
    return NextResponse.json({ ...data, filters: params })
  } catch (error) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 })
  }
}
