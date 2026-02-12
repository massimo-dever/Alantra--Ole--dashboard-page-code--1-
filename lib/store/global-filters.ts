import { create } from "zustand"

export type Scenario = "actuals" | "budget" | "forecast" | "what-if"
export type TimePeriod = "all" | "ytd" | "mtd" | "qtd" | "q1" | "q2" | "q3" | "q4" | "l12m" | "last-30" | "last-90" | "custom"
export type Currency = "USD" | "EUR" | "GBP" | "CAD"
export type AccountType = "bank" | "credit-card" | "investment" | "payroll" | "other"

interface GlobalFiltersState {
  scenario: Scenario
  timePeriod: TimePeriod
  year: number
  entity: string | null
  currency: Currency
  fxConversionEnabled: boolean
  department: string | null
  accountType: AccountType | null
  customDateRange: { from: Date; to: Date }
  setScenario: (scenario: Scenario) => void
  setTimePeriod: (period: TimePeriod) => void
  setYear: (year: number) => void
  setEntity: (entity: string | null) => void
  setCurrency: (currency: Currency) => void
  setFxConversionEnabled: (enabled: boolean) => void
  setDepartment: (department: string | null) => void
  setAccountType: (accountType: AccountType | null) => void
  setCustomDateRange: (range: { from: Date; to: Date }) => void
  clearFilters: () => void
  activeFilterCount: () => number
}

const defaults = {
  scenario: "actuals" as Scenario,
  timePeriod: "ytd" as TimePeriod,
  year: new Date().getFullYear(),
  entity: null as string | null,
  currency: "USD" as Currency,
  fxConversionEnabled: false,
  department: null as string | null,
  accountType: null as AccountType | null,
  customDateRange: { from: new Date(), to: new Date() },
}

export const useGlobalFilters = create<GlobalFiltersState>((set, get) => ({
  ...defaults,
  setScenario: (scenario) => set({ scenario }),
  setTimePeriod: (timePeriod) => set({ timePeriod }),
  setYear: (year) => set({ year }),
  setEntity: (entity) => set({ entity }),
  setCurrency: (currency) => set({ currency }),
  setFxConversionEnabled: (fxConversionEnabled) => set({ fxConversionEnabled }),
  setDepartment: (department) => set({ department }),
  setAccountType: (accountType) => set({ accountType }),
  setCustomDateRange: (customDateRange) => set({ customDateRange }),
  clearFilters: () => set({ ...defaults }),
  activeFilterCount: () => {
    const state = get()
    let count = 0
    if (state.entity) count++
    if (state.department) count++
    if (state.accountType) count++
    if (state.scenario !== "actuals") count++
    if (state.timePeriod !== "ytd") count++
    if (state.currency !== "USD") count++
    if (state.fxConversionEnabled) count++
    return count
  },
}))
