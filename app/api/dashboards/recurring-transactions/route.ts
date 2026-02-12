import { getRecurringTransactionsData } from "@/lib/mock-data/dashboards/recurring-transactions"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(getRecurringTransactionsData())
}
