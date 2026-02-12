import { getCashFlowData } from "@/lib/mock-data/dashboards/cash-flow"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(getCashFlowData())
}
