"use client"

import { useState } from "react"
import { Filter, X, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useGlobalFilters } from "@/lib/store/global-filters"

export function GlobalFiltersPanel() {
  const [open, setOpen] = useState(false)
  const filters = useGlobalFilters()

  const activeCount = filters.activeFilterCount()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 border-border text-foreground hover:bg-accent bg-transparent"
        >
          <Filter className="size-3.5" />
          <span className="text-xs">Filters</span>
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px]" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-foreground">Global Filters</h4>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={filters.clearFilters}
                className="h-6 px-2 text-xs text-muted-foreground gap-1"
              >
                <RotateCcw className="size-3" />
                Reset
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {/* Scenario */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Scenario</Label>
              <Select value={filters.scenario} onValueChange={(v) => filters.setScenario(v as typeof filters.scenario)}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actuals">Actuals</SelectItem>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="forecast">Forecast</SelectItem>
                  <SelectItem value="what-if">What-If</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Period */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Time Period</Label>
              <Select value={filters.timePeriod} onValueChange={(v) => filters.setTimePeriod(v as typeof filters.timePeriod)}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="mtd">Month to Date</SelectItem>
                  <SelectItem value="qtd">Quarter to Date</SelectItem>
                  <SelectItem value="q1">Q1 {filters.year}</SelectItem>
                  <SelectItem value="q2">Q2 {filters.year}</SelectItem>
                  <SelectItem value="q3">Q3 {filters.year}</SelectItem>
                  <SelectItem value="q4">Q4 {filters.year}</SelectItem>
                  <SelectItem value="l12m">Last 12 Months</SelectItem>
                  <SelectItem value="last-30">Last 30 Days</SelectItem>
                  <SelectItem value="last-90">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Entity */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Entity</Label>
              <Select value={filters.entity ?? "all"} onValueChange={(v) => filters.setEntity(v === "all" ? null : v)}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="us entity">US Entity</SelectItem>
                  <SelectItem value="uk entity">UK Entity</SelectItem>
                  <SelectItem value="eu entity">EU Entity</SelectItem>
                  <SelectItem value="ca entity">CA Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Department</Label>
              <Select value={filters.department ?? "all"} onValueChange={(v) => filters.setDepartment(v === "all" ? null : v)}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Account Type</Label>
              <Select value={filters.accountType ?? "all"} onValueChange={(v) => filters.setAccountType(v === "all" ? null : (v as typeof filters.accountType))}>
                <SelectTrigger className="h-8 text-xs bg-transparent">
                  <SelectValue placeholder="All types" />
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

            <Separator />

            {/* Currency */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium text-muted-foreground">Currency</Label>
              </div>
              <Select value={filters.currency} onValueChange={(v) => filters.setCurrency(v as typeof filters.currency)}>
                <SelectTrigger className="h-8 text-xs w-24 bg-transparent">
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

            {/* FX Conversion */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">FX Conversion</Label>
              <Switch
                checked={filters.fxConversionEnabled}
                onCheckedChange={filters.setFxConversionEnabled}
              />
            </div>
          </div>

          {/* Active filter pills */}
          {activeCount > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex flex-wrap gap-1.5">
                {filters.entity && (
                  <Badge variant="secondary" className="text-xs gap-1 h-6">
                    {filters.entity}
                    <button onClick={() => filters.setEntity(null)} className="ml-0.5 hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {filters.department && (
                  <Badge variant="secondary" className="text-xs gap-1 h-6">
                    {filters.department}
                    <button onClick={() => filters.setDepartment(null)} className="ml-0.5 hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {filters.accountType && (
                  <Badge variant="secondary" className="text-xs gap-1 h-6">
                    {filters.accountType}
                    <button onClick={() => filters.setAccountType(null)} className="ml-0.5 hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {filters.scenario !== "actuals" && (
                  <Badge variant="secondary" className="text-xs gap-1 h-6">
                    {filters.scenario}
                    <button onClick={() => filters.setScenario("actuals")} className="ml-0.5 hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
