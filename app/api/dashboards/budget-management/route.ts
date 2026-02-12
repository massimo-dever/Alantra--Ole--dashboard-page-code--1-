import { NextResponse } from "next/server"
import { getBudgetManagementData } from "@/lib/mock-data/dashboards/budget-management"

export async function GET() {
  const data = getBudgetManagementData()
  return NextResponse.json(data)
}
