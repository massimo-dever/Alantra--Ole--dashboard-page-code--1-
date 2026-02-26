"use client"

import { useState, useMemo } from "react"
import { Sidebar, type DashboardView } from "@/components/sidebar"
import { Header } from "@/components/header"
import { BudgetSummaryView } from "@/components/views/budget-summary-view"
import { OverviewDashboard } from "@/components/views/overview-dashboard"
import { CashFlowDashboard } from "@/components/views/cash-flow-dashboard"
import { SpendingAnalysisDashboard } from "@/components/views/spending-analysis-dashboard"
import { IncomeAnalysisDashboard } from "@/components/views/income-analysis-dashboard"
import { CashPositioningDashboard } from "@/components/views/cash-positioning-dashboard"
import { BudgetManagementDashboard } from "@/components/views/budget-management-dashboard"
import { RecurringTransactionsDashboard } from "@/components/views/recurring-transactions-dashboard"
import { FinancialGoalsDashboard } from "@/components/views/financial-goals-dashboard"
import { InvestmentPortfolioDashboard } from "@/components/views/investment-portfolio-dashboard"
import { TransactionsView } from "@/components/views/transactions-view"
import { SettingsView } from "@/components/views/settings-view"
import { ReportsDashboard } from "@/components/views/reports-dashboard"
import { ReportBuilder } from "@/components/reports/report-builder"
import { HomeDashboard } from "@/components/views/home-dashboard"

const viewTitles: Record<DashboardView, string> = {
  home: "Home",
  "budget-summary": "Budget Summary",
  overview: "Overview",
  "cash-flow": "Cash Flow",
  "spending-analysis": "Spending Analysis",
  "income-analysis": "Income Analysis",
  "cash-positioning": "Cash Positioning",
  "budget-management": "Budget Management",
  "recurring-transactions": "Recurring Transactions",
  "financial-goals": "Financial Goals",
  "investment-portfolio": "Investment Portfolio",
  transactions: "Transactions",
  reports: "Board & Investor Reports",
  settings: "Settings",
}

const viewSections: Record<DashboardView, string> = {
  home: "Home",
  "budget-summary": "Dashboards",
  overview: "Dashboards",
  "cash-flow": "Dashboards",
  "spending-analysis": "Dashboards",
  "income-analysis": "Dashboards",
  "cash-positioning": "Dashboards",
  "budget-management": "Dashboards",
  "recurring-transactions": "Dashboards",
  "financial-goals": "Dashboards",
  "investment-portfolio": "Dashboards",
  transactions: "Data",
  reports: "Reporting",
  settings: "Platform",
}

export default function Home() {
  const [currentView, setCurrentView] = useState<DashboardView>("home")
  const [showReportBuilder, setShowReportBuilder] = useState(false)

  const renderView = () => {
    switch (currentView) {
      case "home":
        return <HomeDashboard />
      case "budget-summary":
        return <BudgetSummaryView />
      case "overview":
        return <OverviewDashboard />
      case "cash-flow":
        return <CashFlowDashboard />
      case "spending-analysis":
        return <SpendingAnalysisDashboard />
      case "income-analysis":
        return <IncomeAnalysisDashboard />
      case "cash-positioning":
        return <CashPositioningDashboard />
      case "budget-management":
        return <BudgetManagementDashboard />
      case "recurring-transactions":
        return <RecurringTransactionsDashboard />
      case "financial-goals":
        return <FinancialGoalsDashboard />
      case "investment-portfolio":
        return <InvestmentPortfolioDashboard />
      case "transactions":
        return <TransactionsView />
      case "reports":
        return <ReportsDashboard onOpenBuilder={() => setShowReportBuilder(true)} />
      case "settings":
        return <SettingsView />
      default:
        return <HomeDashboard />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={viewTitles[currentView]} section={viewSections[currentView]} />
        {renderView()}
      </div>
      {showReportBuilder && <ReportBuilder onClose={() => setShowReportBuilder(false)} />}
    </div>
  )
}
