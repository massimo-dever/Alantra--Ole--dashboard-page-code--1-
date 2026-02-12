"use client"

import {
  useGlobalFilters,
  type Scenario,
  type TimePeriod,
  type Currency,
  type AccountType,
} from "@/lib/store/global-filters"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DateRangePicker } from "@/components/date-range-picker"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { startOfYear, startOfMonth, startOfQuarter, subDays } from "date-fns"
import { useMemo } from "react"

const entities = ["All Entities", "US Entity", "UK Entity", "EU Entity", "CA Entity"]
const departments = [
  "All Departments",
  "Product",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
  "Engineering",
  "Customer Support",
]

export function GlobalFilters() {
  const filters = useGlobalFilters()
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const dateRange = useMemo(() => {
    if (filters.timePeriod === "custom" && filters.customDateRange.from && filters.customDateRange.to) {
      return { from: filters.customDateRange.from, to: filters.customDateRange.to }
    }
    if (filters.timePeriod === "ytd") {
      return { from: startOfYear(new Date(filters.year, 0, 1)), to: new Date() }
    }
    if (filters.timePeriod === "mtd") {
      return { from: startOfMonth(new Date()), to: new Date() }
    }
    if (filters.timePeriod === "qtd") {
      return { from: startOfQuarter(new Date()), to: new Date() }
    }
    if (filters.timePeriod === "last-30") {
      return { from: subDays(new Date(), 30), to: new Date() }
    }
    if (filters.timePeriod === "last-90") {
      return { from: subDays(new Date(), 90), to: new Date() }
    }
    return undefined
  }, [filters.timePeriod, filters.year, filters.customDateRange])

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range?.from && range?.to) {
      filters.setCustomDateRange({ from: range.from, to: range.to })
      filters.setTimePeriod("custom")
    }
  }

  return (
    <TooltipProvider>
      <div className="border-b bg-card px-6 py-3 space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Scenario */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Scenario:</Label>
            <Select value={filters.scenario} onValueChange={(v) => filters.setScenario(v as Scenario)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actuals">Actuals</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="forecast">Forecast</SelectItem>
                <SelectItem value="what-if">What-if</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Period */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Time Period:</Label>
            <Select value={filters.timePeriod} onValueChange={(v) => filters.setTimePeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ytd">YTD</SelectItem>
                <SelectItem value="mtd">MTD</SelectItem>
                <SelectItem value="qtd">QTD</SelectItem>
                <SelectItem value="last-30">Last 30 days</SelectItem>
                <SelectItem value="last-90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {filters.timePeriod === "custom" && (
            <div className="flex items-center gap-2">
              <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
            </div>
          )}

          {/* Year */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Year:</Label>
            <Select value={filters.year.toString()} onValueChange={(v) => filters.setYear(Number.parseInt(v))}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entity */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Entity:</Label>
            <Select value={filters.entity || "all"} onValueChange={(v) => filters.setEntity(v === "all" ? null : v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity} value={entity === "All Entities" ? "all" : entity.toLowerCase()}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Currency:</Label>
            <Select value={filters.currency} onValueChange={(v) => filters.setCurrency(v as Currency)}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* FX Conversion Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="fx-conversion"
              checked={filters.fxConversionEnabled}
              onCheckedChange={filters.setFxConversionEnabled}
            />
            <Label htmlFor="fx-conversion" className="text-xs text-muted-foreground cursor-pointer">
              FX Conversion
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Convert all amounts to selected currency</TooltipContent>
            </Tooltip>
          </div>

          {/* Department */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Department:</Label>
            <Select
              value={filters.department || "all"}
              onValueChange={(v) => filters.setDepartment(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept === "All Departments" ? "all" : dept.toLowerCase()}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Type */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Account Type:</Label>
            <Select
              value={filters.accountType || "all"}
              onValueChange={(v) => filters.setAccountType(v === "all" ? null : (v as AccountType))}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="credit-card">Credit Card</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
