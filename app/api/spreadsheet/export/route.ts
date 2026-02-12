import { NextRequest, NextResponse } from "next/server"
import { getTransactions } from "@/lib/mock-data/transactions"

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "transactions"
  const format = request.nextUrl.searchParams.get("format") || "csv"

  if (format !== "csv") {
    return NextResponse.json({ error: "Only CSV format is supported" }, { status: 400 })
  }

  let csvContent = ""
  let filename = "export.csv"

  switch (type) {
    case "transactions": {
      const transactions = getTransactions()
      csvContent = "ID,Date,Merchant,Description,Category,Department,Type,Amount,Account,Status\n"
      csvContent += transactions.map(t =>
        `${t.id},${t.date},"${t.merchant}","${t.description}",${t.category},${t.department},${t.type},${t.amount},${t.account},${t.status}`
      ).join("\n")
      filename = `transactions_${new Date().toISOString().split("T")[0]}.csv`
      break
    }
    case "accounts": {
      csvContent = "Account,Entity,Type,Currency,Amount,Last Updated\n"
      csvContent += [
        "Chase Business,US Entity,Bank,USD,2500000,2024-12-15",
        "Wells Fargo,US Entity,Bank,USD,1000000,2024-12-15",
        "Barclays UK,UK Entity,Bank,GBP,1200000,2024-12-14",
        "Deutsche Bank,EU Entity,Bank,EUR,750000,2024-12-14",
        "RBC Canada,CA Entity,Bank,CAD,550000,2024-12-13",
      ].join("\n")
      filename = `accounts_${new Date().toISOString().split("T")[0]}.csv`
      break
    }
    default: {
      return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 })
    }
  }

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
