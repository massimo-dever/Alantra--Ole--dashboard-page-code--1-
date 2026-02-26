"use client"

import React from "react"

import { useState } from "react"
import {
  LayoutDashboard,
  Settings,
  Table2,
  Box,
  Map,
  CheckCircle2,
  Link2,
  RefreshCw,
  ChevronDown,
  PanelLeft,
  PanelRight,
  TrendingUp,
  DollarSign,
  PieChart,
  Target,
  Wallet,
  Receipt,
  Calendar,
  BarChart3,
  FileText,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export type DashboardView =
  | "home"
  | "budget-summary"
  | "overview"
  | "cash-flow"
  | "spending-analysis"
  | "income-analysis"
  | "cash-positioning"
  | "budget-management"
  | "recurring-transactions"
  | "financial-goals"
  | "investment-portfolio"
  | "transactions"
  | "reports"
  | "settings"

interface SidebarProps {
  currentView: DashboardView
  onViewChange: (view: DashboardView) => void
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { toast } = useToast()
  const handleComingSoon = (label: string) => {
    toast({ title: `${label}`, description: "This feature is coming soon." })
  }

  return (
    <div
      className={cn(
        "border-r border-sidebar-border bg-sidebar flex flex-col h-full flex-shrink-0 transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo / Brand */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-semibold text-sidebar-foreground">
          <div className="size-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
            A
          </div>
          {!collapsed && (
            <>
              <span className="text-sm">Alantra</span>
              <ChevronDown className="size-3.5 text-muted-foreground ml-0.5" />
            </>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "text-muted-foreground hover:text-sidebar-foreground transition-colors",
            collapsed ? "mx-auto mt-0" : "ml-auto",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelRight className="size-4" /> : <PanelLeft className="size-4" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {/* Quick actions */}
        <div className="space-y-0.5">
          <NavItem icon={Home} label="Home" active={currentView === "home"} onClick={() => onViewChange("home")} collapsed={collapsed} />
          <NavItem icon={Settings} label="Settings" active={currentView === "settings"} onClick={() => onViewChange("settings")} collapsed={collapsed} />
        </div>

        {/* Dashboard views */}
        <div>
          {!collapsed && (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Dashboards
            </div>
          )}
          <div className="space-y-0.5 mt-1">
            <NavItem
              icon={TrendingUp}
              label="Budget Summary"
              active={currentView === "budget-summary"}
              onClick={() => onViewChange("budget-summary")}
              collapsed={collapsed}
            />
            <NavItem
              icon={LayoutDashboard}
              label="Overview"
              active={currentView === "overview"}
              onClick={() => onViewChange("overview")}
              collapsed={collapsed}
            />
            <NavItem
              icon={DollarSign}
              label="Cash Flow"
              active={currentView === "cash-flow"}
              onClick={() => onViewChange("cash-flow")}
              collapsed={collapsed}
            />
            <NavItem
              icon={PieChart}
              label="Spending Analysis"
              active={currentView === "spending-analysis"}
              onClick={() => onViewChange("spending-analysis")}
              collapsed={collapsed}
            />
            <NavItem
              icon={BarChart3}
              label="Income Analysis"
              active={currentView === "income-analysis"}
              onClick={() => onViewChange("income-analysis")}
              collapsed={collapsed}
            />
            <NavItem
              icon={Wallet}
              label="Cash Positioning"
              active={currentView === "cash-positioning"}
              onClick={() => onViewChange("cash-positioning")}
              collapsed={collapsed}
            />
            <NavItem
              icon={Receipt}
              label="Budget Management"
              active={currentView === "budget-management"}
              onClick={() => onViewChange("budget-management")}
              collapsed={collapsed}
            />
            <NavItem
              icon={Calendar}
              label="Recurring Transactions"
              active={currentView === "recurring-transactions"}
              onClick={() => onViewChange("recurring-transactions")}
              collapsed={collapsed}
            />
            <NavItem
              icon={Target}
              label="Financial Goals"
              active={currentView === "financial-goals"}
              onClick={() => onViewChange("financial-goals")}
              collapsed={collapsed}
            />
            <NavItem
              icon={TrendingUp}
              label="Investment Portfolio"
              active={currentView === "investment-portfolio"}
              onClick={() => onViewChange("investment-portfolio")}
              collapsed={collapsed}
            />
          </div>
        </div>

        {/* Reporting section */}
        <div>
          {!collapsed && (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Reporting
            </div>
          )}
          <div className="space-y-0.5 mt-1">
            <NavItem
              icon={FileText}
              label="Board & Investor"
              active={currentView === "reports"}
              onClick={() => onViewChange("reports")}
              collapsed={collapsed}
            />
          </div>
        </div>

        {/* Data section */}
        <div>
          {!collapsed && (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Data
            </div>
          )}
          <div className="space-y-0.5 mt-1">
            <NavItem icon={Receipt} label="Transactions" active={currentView === "transactions"} onClick={() => onViewChange("transactions")} collapsed={collapsed} />
            <NavItem icon={Table2} label="Tables" active={false} onClick={() => handleComingSoon("Tables")} collapsed={collapsed} />
            <NavItem icon={Box} label="Dimensions" active={false} onClick={() => handleComingSoon("Dimensions")} collapsed={collapsed} />
            <NavItem
              icon={Map}
              label="Mappings"
              badge="1"
              active={false}
              onClick={() => handleComingSoon("Mappings")}
              collapsed={collapsed}
            />
            <NavItem
              icon={CheckCircle2}
              label="Checks"
              badge="1"
              active={false}
              onClick={() => handleComingSoon("Checks")}
              collapsed={collapsed}
            />
            <NavItem icon={Link2} label="Integrations" active={false} onClick={() => onViewChange("settings")} collapsed={collapsed} />
            <NavItem
              icon={RefreshCw}
              label="Exchange Rates"
              active={false}
              onClick={() => handleComingSoon("Exchange Rates")}
              collapsed={collapsed}
            />
          </div>
        </div>
      </div>

      {/* User profile footer */}
      <div className="p-3 border-t border-sidebar-border mt-auto">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="size-8 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-sidebar-foreground font-medium text-xs flex-shrink-0">
            JD
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-foreground truncate">John Doe</div>
              <div className="text-xs text-muted-foreground truncate">Admin</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
  collapsed,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  badge?: string
  onClick: () => void
  collapsed?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "w-full flex items-center gap-3 text-sm font-medium rounded-md transition-colors",
        collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon className={cn("size-4 flex-shrink-0", active ? "text-sidebar-primary" : "")} />
      {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
      {!collapsed && badge && (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-destructive/10 text-destructive rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}
