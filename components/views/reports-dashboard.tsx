"use client"

import React from "react"

import { useState, useMemo } from "react"
import {
  Search,
  Plus,
  MoreHorizontal,
  FileText,
  Calendar,
  Clock,
  Users,
  LayoutGrid,
  List,
  Copy,
  Download,
  Trash2,
  Edit3,
  Bookmark,
  BarChart3,
  TrendingUp,
  PieChart,
  Send,
  ChevronDown,
  Filter,
  ArrowUpDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"

// ---------- Types ----------
interface Report {
  id: string
  title: string
  templateType: string
  createdAt: string
  status: "draft" | "scheduled" | "sent"
  recipients: number
  lastEdited: string
  scheduledDate?: string
}

interface Template {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  lastUsed: string
  description: string
  category: "standard" | "custom"
}

// ---------- Mock data ----------
const templates: Template[] = [
  { id: "monthly-perf", name: "Monthly Performance Summary", icon: BarChart3, lastUsed: "Jan 15, 2026", description: "Key metrics, runway, MRR, and burn rate", category: "standard" },
  { id: "quarterly-board", name: "Quarterly Board Package", icon: FileText, lastUsed: "Dec 31, 2025", description: "Full financial package for board review", category: "standard" },
  { id: "investor-update", name: "Investor Update", icon: TrendingUp, lastUsed: "Jan 20, 2026", description: "Concise update for LP/investor communications", category: "standard" },
  { id: "annual-summary", name: "Annual Summary", icon: PieChart, lastUsed: "Dec 31, 2025", description: "Year-end comprehensive financial summary", category: "standard" },
  { id: "custom-1", name: "PE Portfolio Review", icon: Bookmark, lastUsed: "Jan 10, 2026", description: "Custom template for portfolio company reviews", category: "custom" },
  { id: "custom-2", name: "Cash Forecast Memo", icon: Bookmark, lastUsed: "Jan 5, 2026", description: "Custom 13-week cash forecast format", category: "custom" },
]

const mockReports: Report[] = [
  { id: "1", title: "Q4 2025 Board Package", templateType: "Quarterly Board Package", createdAt: "2026-01-28", status: "sent", recipients: 8, lastEdited: "2026-01-28" },
  { id: "2", title: "January 2026 Performance", templateType: "Monthly Performance Summary", createdAt: "2026-02-01", status: "draft", recipients: 0, lastEdited: "2026-02-10" },
  { id: "3", title: "Investor Update - Feb 2026", templateType: "Investor Update", createdAt: "2026-02-05", status: "scheduled", recipients: 12, lastEdited: "2026-02-08", scheduledDate: "2026-02-15" },
  { id: "4", title: "2025 Annual Summary", templateType: "Annual Summary", createdAt: "2026-01-15", status: "sent", recipients: 15, lastEdited: "2026-01-15" },
  { id: "5", title: "PE Portfolio Review - Q4", templateType: "PE Portfolio Review", createdAt: "2026-01-20", status: "sent", recipients: 5, lastEdited: "2026-01-20" },
  { id: "6", title: "December Performance Summary", templateType: "Monthly Performance Summary", createdAt: "2025-12-31", status: "sent", recipients: 8, lastEdited: "2025-12-31" },
  { id: "7", title: "Cash Forecast - Week 6", templateType: "Cash Forecast Memo", createdAt: "2026-02-09", status: "draft", recipients: 0, lastEdited: "2026-02-09" },
]

const recentActivity = [
  { label: "Q4 2025 Board Package sent", time: "2 weeks ago" },
  { label: "Investor Update scheduled for Feb 15", time: "3 days ago" },
  { label: "January Performance draft created", time: "1 day ago" },
]

// ---------- Component ----------
export function ReportsDashboard({ onOpenBuilder }: { onOpenBuilder: () => void }) {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [templateFilter, setTemplateFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  const filtered = useMemo(() => {
    let items = [...mockReports]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(r => r.title.toLowerCase().includes(q) || r.templateType.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") items = items.filter(r => r.status === statusFilter)
    if (templateFilter !== "all") items = items.filter(r => r.templateType === templateFilter)
    items.sort((a, b) => {
      if (sortBy === "date") return b.createdAt.localeCompare(a.createdAt)
      if (sortBy === "name") return a.title.localeCompare(b.title)
      return a.status.localeCompare(b.status)
    })
    return items
  }, [search, statusFilter, templateFilter, sortBy])

  const statusColor = (s: Report["status"]) => {
    if (s === "sent") return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
    if (s === "scheduled") return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
    return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
  }

  const daysUntilBoardMeeting = 18
  const daysUntilQuarterlyDue = 47

  const standardTemplates = templates.filter(t => t.category === "standard")
  const customTemplates = templates.filter(t => t.category === "custom")

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-12 gap-6 h-full">

        {/* LEFT SIDEBAR -- Templates & Filters */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Filters card */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Filter className="size-3.5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="scheduled" className="text-xs">Scheduled</SelectItem>
                    <SelectItem value="sent" className="text-xs">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Template Type</label>
                <Select value={templateFilter} onValueChange={setTemplateFilter}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Templates</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.name} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates accordion */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-foreground">Report Templates</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion type="multiple" defaultValue={["standard", "custom"]} className="space-y-0">
                <AccordionItem value="standard" className="border-b-0">
                  <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2 hover:no-underline">
                    Standard Templates
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pb-3">
                    {standardTemplates.map(t => (
                      <TemplateCard key={t.id} template={t} onUse={() => { toast({ title: `Template "${t.name}" selected`, description: "Open the report builder to use this template." }); onOpenBuilder() }} />
                    ))}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="custom" className="border-b-0">
                  <AccordionTrigger className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2 hover:no-underline">
                    Custom Templates
                  </AccordionTrigger>
                  <AccordionContent className="space-y-1.5 pb-1">
                    {customTemplates.map(t => (
                      <TemplateCard key={t.id} template={t} onUse={() => { toast({ title: `Template "${t.name}" selected` }); onOpenBuilder() }} />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* CENTER -- Reports List */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">Reports</CardTitle>
                <Button size="sm" className="gap-1.5 text-xs h-8" onClick={onOpenBuilder}>
                  <Plus className="size-3.5" />
                  Create Report
                </Button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <ArrowUpDown className="size-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date" className="text-xs">By Date</SelectItem>
                      <SelectItem value="name" className="text-xs">By Name</SelectItem>
                      <SelectItem value="status" className="text-xs">By Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center border border-border rounded-md overflow-hidden">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 ${viewMode === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      aria-label="List view"
                    >
                      <List className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 ${viewMode === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No reports found</p>
                  <p className="text-xs text-muted-foreground mb-4">Create your first report to get started.</p>
                  <Button size="sm" className="gap-1.5 text-xs" onClick={onOpenBuilder}>
                    <Plus className="size-3.5" />
                    Create Your First Report
                  </Button>
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-0 divide-y divide-border/50">
                  {filtered.map(r => (
                    <ReportListItem key={r.id} report={r} statusColor={statusColor} toast={toast} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.map(r => (
                    <ReportGridItem key={r.id} report={r} statusColor={statusColor} toast={toast} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL -- Quick Actions */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Countdown cards */}
          <Card className="shadow-sm border-border">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Next Board Meeting</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">{daysUntilBoardMeeting} days</p>
                  <p className="text-[10px] text-muted-foreground">March 1, 2026</p>
                </div>
              </div>
              <div className="border-t border-border/50" />
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="size-4 text-chart-2" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Quarterly Report Due</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">{daysUntilQuarterlyDue} days</p>
                  <p className="text-[10px] text-muted-foreground">March 31, 2026</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Buttons */}
          <Card className="shadow-sm border-border">
            <CardContent className="pt-5 space-y-2">
              <Button className="w-full gap-1.5 text-xs h-9" onClick={onOpenBuilder}>
                <Plus className="size-3.5" />
                Generate Report
              </Button>
              <Button variant="outline" className="w-full gap-1.5 text-xs h-9 bg-transparent" onClick={() => toast({ title: "Schedule Report", description: "Open a report to configure scheduling." })}>
                <Send className="size-3.5" />
                Schedule Report
              </Button>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-foreground">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="size-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-foreground/80 leading-snug">{a.label}</p>
                    <p className="text-[10px] text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------- Sub-components ----------
function TemplateCard({ template, onUse }: { template: Template; onUse: () => void }) {
  const Icon = template.icon
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-md border border-border/50 hover:border-border hover:bg-muted/30 transition-colors group">
      <div className="size-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{template.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Last used {template.lastUsed}</p>
      </div>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" onClick={onUse}>
        Use
      </Button>
    </div>
  )
}

function ReportListItem({ report, statusColor, toast }: { report: Report; statusColor: (s: Report["status"]) => string; toast: ReturnType<typeof useToast>["toast"] }) {
  return (
    <div className="flex items-center gap-4 py-3 group">
      <div className="size-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <FileText className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{report.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px] font-normal h-4 px-1.5">{report.templateType}</Badge>
          <span className="text-[10px] text-muted-foreground">{report.createdAt}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {report.recipients > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Users className="size-3" />
            {report.recipients}
          </span>
        )}
        <Badge variant="secondary" className={`text-[10px] capitalize h-5 px-1.5 ${statusColor(report.status)}`}>
          {report.status}
        </Badge>
        <ReportActions report={report} toast={toast} />
      </div>
    </div>
  )
}

function ReportGridItem({ report, statusColor, toast }: { report: Report; statusColor: (s: Report["status"]) => string; toast: ReturnType<typeof useToast>["toast"] }) {
  return (
    <div className="border border-border/50 rounded-lg p-4 hover:border-border hover:bg-muted/20 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
          <FileText className="size-4 text-muted-foreground" />
        </div>
        <ReportActions report={report} toast={toast} />
      </div>
      <p className="text-xs font-medium text-foreground truncate mb-1">{report.title}</p>
      <Badge variant="outline" className="text-[10px] font-normal h-4 px-1.5 mb-2">{report.templateType}</Badge>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">{report.createdAt}</span>
        <div className="flex items-center gap-2">
          {report.recipients > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Users className="size-3" />
              {report.recipients}
            </span>
          )}
          <Badge variant="secondary" className={`text-[10px] capitalize h-5 px-1.5 ${statusColor(report.status)}`}>
            {report.status}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function ReportActions({ report, toast }: { report: Report; toast: ReturnType<typeof useToast>["toast"] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem className="text-xs gap-2" onClick={() => toast({ title: "Edit Report", description: `Opening "${report.title}" in the builder.` })}>
          <Edit3 className="size-3.5" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs gap-2" onClick={() => toast({ title: "Duplicated", description: `Copy of "${report.title}" created.` })}>
          <Copy className="size-3.5" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs gap-2" onClick={() => toast({ title: "Downloading PDF...", description: "Your report will be ready shortly." })}>
          <Download className="size-3.5" /> Download PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs gap-2 text-destructive" onClick={() => toast({ title: "Report deleted", description: `"${report.title}" has been removed.` })}>
          <Trash2 className="size-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
