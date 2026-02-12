import { getFinancialGoalsData } from "@/lib/mock-data/dashboards/financial-goals"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(getFinancialGoalsData())
}
