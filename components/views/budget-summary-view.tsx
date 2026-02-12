"use client"

import { useState } from "react"
import { TrendedOpexChart } from "@/components/charts/trended-opex"
import { MetricCard } from "@/components/charts/metric-card"
import { BudgetPerDeptChart } from "@/components/charts/budget-per-dept"
import { OpexPerHeadChart } from "@/components/charts/opex-per-head"
import { TopVendorsTable } from "@/components/charts/top-vendors"
import { DrillDownMenu, type DrillDownOption } from "@/components/drill-down-menu"
import { useGlobalFilters } from "@/lib/store/global-filters"

export function BudgetSummaryView() {
  const [showDrillDown, setShowDrillDown] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<DrillDownOption[]>(["Vendor Name"])
  const [appliedFilters, setAppliedFilters] = useState<DrillDownOption[]>(["Vendor Name"])
  const filters = useGlobalFilters()

  const metrics = {
    fteCount: "300",
    fteChange: "+15.3",
    spend: "$130.1M",
    spendChange: "+45.7",
  }

  const handleClose = () => {
    setShowDrillDown(false)
    setSelectedFilters(appliedFilters)
  }

  const handleAccept = () => {
    setAppliedFilters(selectedFilters)
    setShowDrillDown(false)
  }

  return (
    <div className="flex-1 overflow-auto p-6 relative">
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7 xl:col-span-8">
          <TrendedOpexChart />
        </div>

        <div className="col-span-12 lg:col-span-5 xl:col-span-4 grid grid-cols-2 gap-6">
          <MetricCard title="2024E FTE Count" value={metrics.fteCount} change={metrics.fteChange} trend="up" />
          <MetricCard title="2024E Headcount Spend" value={metrics.spend} change={metrics.spendChange} trend="up" />
          <div className="col-span-2 grid grid-cols-2 gap-6">
            <BudgetPerDeptChart />
            <OpexPerHeadChart />
          </div>
        </div>
      </div>

      <div className="relative">
        <TopVendorsTable appliedFilters={appliedFilters} />

        {showDrillDown && (
          <div className="absolute top-1/3 left-[40%] z-10">
            <DrillDownMenu
              selectedFilters={selectedFilters}
              onFiltersChange={setSelectedFilters}
              onClose={handleClose}
              onAccept={handleAccept}
            />
          </div>
        )}
      </div>
    </div>
  )
}
