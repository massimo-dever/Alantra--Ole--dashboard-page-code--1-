"use client"

import useSWR from "swr"
import { useGlobalFilters } from "@/lib/store/global-filters"

export type DashboardType = "overview" | "cash-positioning" | "spending-analysis" | "income-analysis" | "budget-management" | "cash-flow" | "recurring-transactions" | "financial-goals" | "investment-portfolio"

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error("Failed to fetch dashboard data")
  return res.json()
})

export function useDashboardData<T = Record<string, unknown>>(dashboardType: DashboardType) {
  const {
    scenario, timePeriod, year, entity, department, accountType, currency,
    customDateRange, fxConversionEnabled,
  } = useGlobalFilters()

  const queryParams = new URLSearchParams()
  queryParams.set("scenario", scenario)
  queryParams.set("timePeriod", timePeriod)
  queryParams.set("year", String(year))
  queryParams.set("currency", currency)
  if (entity) queryParams.set("entity", entity)
  if (department) queryParams.set("department", department)
  if (accountType) queryParams.set("accountType", accountType)
  if (timePeriod === "custom") {
    queryParams.set("from", customDateRange.from.toISOString().split("T")[0])
    queryParams.set("to", customDateRange.to.toISOString().split("T")[0])
  }

  const url = `/api/dashboards/${dashboardType}?${queryParams.toString()}`

  const { data, error, isLoading, mutate } = useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  return {
    data,
    error,
    isLoading,
    isMockData: (data as Record<string, unknown>)?.isMockData === true,
    refresh: () => mutate(),
  }
}
