import { NextRequest, NextResponse } from "next/server"
import { parseDashboardQuery } from "@/lib/validations/dashboard-query"
import { getCashPositioningData } from "@/lib/mock-data/dashboards/cash-positioning"

export async function GET(request: NextRequest) {
  try {
    const params = parseDashboardQuery(request.nextUrl.searchParams)
    const data = getCashPositioningData({ entity: params.entity, accountType: params.accountType })
    return NextResponse.json({ ...data, filters: params })
  } catch (error) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 })
  }
}
