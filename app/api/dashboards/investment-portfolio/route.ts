import { getInvestmentPortfolioData } from "@/lib/mock-data/dashboards/investment-portfolio"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(getInvestmentPortfolioData())
}
