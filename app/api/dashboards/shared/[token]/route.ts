import { NextRequest, NextResponse } from "next/server"
import { getOverviewData } from "@/lib/mock-data/dashboards/overview"

// In production, this would look up the token in a database
// to retrieve the saved dashboard config and data
const mockSharedDashboards: Record<string, { type: string; title: string; createdAt: string; expiresAt: string }> = {
  "demo-share-1": { type: "overview", title: "Q4 Overview Report", createdAt: "2024-12-01", expiresAt: "2025-03-01" },
  "demo-share-2": { type: "spending-analysis", title: "Monthly Spend Review", createdAt: "2024-12-10", expiresAt: "2025-01-10" },
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const shared = mockSharedDashboards[token]
  if (!shared) {
    return NextResponse.json({ error: "Shared dashboard not found or expired" }, { status: 404 })
  }

  // For the MVP, we return overview data regardless of type
  const data = getOverviewData()

  return NextResponse.json({
    shared: {
      token,
      ...shared,
    },
    data,
  })
}
