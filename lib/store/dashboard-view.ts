import { create } from "zustand"

export type DashboardSubView =
  | "budget-summary"
  | "overview"
  | "cash-positioning"
  | "cash-flow"
  | "spending-analysis"
  | "income-analysis"
  | "budget-management"
  | "recurring-transactions"
  | "financial-goals"
  | "investment-portfolio"

interface DashboardViewState {
  currentSubView: DashboardSubView
  setSubView: (view: DashboardSubView) => void
}

export const useDashboardView = create<DashboardViewState>((set) => ({
  currentSubView: "budget-summary",
  setSubView: (currentSubView) => set({ currentSubView }),
}))
