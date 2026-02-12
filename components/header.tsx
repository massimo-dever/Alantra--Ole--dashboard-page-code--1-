"use client"

import { Search, Bell, HelpCircle, Moon, Sun, ChevronRight } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { GlobalFiltersPanel } from "@/components/global-filters-panel"

interface HeaderProps {
  title: string
  section?: string
}

export function Header({ title, section }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="h-14 border-b border-border bg-card flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        {section && (
          <>
            <span className="text-xs font-medium text-muted-foreground truncate">{section}</span>
            <ChevronRight className="size-3 text-muted-foreground/60 flex-shrink-0" />
          </>
        )}
        <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <GlobalFiltersPanel />

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Search">
            <Search className="size-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 relative" aria-label="Notifications">
            <Bell className="size-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 size-1.5 bg-destructive rounded-full" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Help">
            <HelpCircle className="size-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="size-4 text-muted-foreground hidden dark:block" />
            <Moon className="size-4 text-muted-foreground block dark:hidden" />
          </Button>
        </div>
      </div>
    </div>
  )
}
