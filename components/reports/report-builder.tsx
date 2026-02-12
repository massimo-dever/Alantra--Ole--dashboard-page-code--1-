"use client"

import React from "react"

import { useState, useCallback } from "react"
import {
  X,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Check,
  FileText,
  BarChart3,
  TrendingUp,
  PieChart,
  Bookmark,
  Eye,
  Save,
  Send,
  Upload,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// ---------- Types ----------
interface ReportSection {
  id: string
  label: string
  description: string
  enabled: boolean
}

interface MetricOption {
  id: string
  label: string
  category: string
  enabled: boolean
}

// ---------- Step data ----------
const templateOptions = [
  { id: "monthly-perf", name: "Monthly Performance Summary", icon: BarChart3, description: "Key metrics, runway, MRR, and burn rate" },
  { id: "quarterly-board", name: "Quarterly Board Package", icon: FileText, description: "Full financial package for board review" },
  { id: "investor-update", name: "Investor Update", icon: TrendingUp, description: "Concise update for LP/investor communications" },
  { id: "annual-summary", name: "Annual Summary", icon: PieChart, description: "Year-end comprehensive financial summary" },
  { id: "custom", name: "Custom Template", icon: Bookmark, description: "Start from scratch with a blank template" },
]

const defaultSections: ReportSection[] = [
  { id: "exec-summary", label: "Executive Summary", description: "High-level overview and key takeaways", enabled: true },
  { id: "financial-highlights", label: "Financial Highlights", description: "Revenue, expenses, and net income summary", enabled: true },
  { id: "cash-position", label: "Cash Position & Runway", description: "Current cash, burn rate, and projected runway", enabled: true },
  { id: "revenue-breakdown", label: "Revenue Breakdown", description: "Revenue by product, segment, or geography", enabled: true },
  { id: "expense-analysis", label: "Expense Analysis", description: "OpEx breakdown by category and department", enabled: true },
  { id: "budget-variance", label: "Budget vs Actual", description: "Variance analysis against budget targets", enabled: false },
  { id: "key-metrics", label: "Key Performance Metrics", description: "MRR, ARR, churn, LTV, CAC, and other KPIs", enabled: true },
  { id: "headcount", label: "Headcount & Compensation", description: "Team size, hiring, and compensation overview", enabled: false },
  { id: "outlook", label: "Forward-Looking Outlook", description: "Projections, guidance, and strategic initiatives", enabled: true },
  { id: "appendix", label: "Appendix & Notes", description: "Supporting data tables and footnotes", enabled: false },
]

const defaultMetrics: MetricOption[] = [
  { id: "mrr", label: "Monthly Recurring Revenue (MRR)", category: "Revenue", enabled: true },
  { id: "arr", label: "Annual Recurring Revenue (ARR)", category: "Revenue", enabled: true },
  { id: "revenue-growth", label: "Revenue Growth Rate", category: "Revenue", enabled: true },
  { id: "gross-margin", label: "Gross Margin", category: "Profitability", enabled: true },
  { id: "net-income", label: "Net Income", category: "Profitability", enabled: true },
  { id: "ebitda", label: "EBITDA", category: "Profitability", enabled: false },
  { id: "burn-rate", label: "Monthly Burn Rate", category: "Cash", enabled: true },
  { id: "runway", label: "Cash Runway (months)", category: "Cash", enabled: true },
  { id: "cash-balance", label: "Cash & Equivalents", category: "Cash", enabled: true },
  { id: "cac", label: "Customer Acquisition Cost", category: "Unit Economics", enabled: false },
  { id: "ltv", label: "Lifetime Value", category: "Unit Economics", enabled: false },
  { id: "churn", label: "Monthly Churn Rate", category: "Unit Economics", enabled: true },
  { id: "headcount", label: "Total Headcount", category: "Operations", enabled: false },
  { id: "opex-per-head", label: "OpEx per Employee", category: "Operations", enabled: false },
]

const steps = ["Template & Basics", "Sections", "Metrics & KPIs", "Preview & Send"]

// ---------- Component ----------
export function ReportBuilder({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)

  // Step 1 state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("quarterly-board")
  const [reportTitle, setReportTitle] = useState("Q1 2026 Board Package")
  const [reportingPeriod, setReportingPeriod] = useState("q1-2026")
  const [fiscalYear, setFiscalYear] = useState("2026")

  // Step 2 state
  const [sections, setSections] = useState<ReportSection[]>(defaultSections)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // Step 3 state
  const [metrics, setMetrics] = useState<MetricOption[]>(defaultMetrics)

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  const toggleMetric = (id: string) => {
    setMetrics(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))
  }

  const handleDragStart = (index: number) => setDragIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    setSections(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(dragIndex, 1)
      updated.splice(index, 0, moved)
      return updated
    })
    setDragIndex(index)
  }
  const handleDragEnd = () => setDragIndex(null)

  const enabledSections = sections.filter(s => s.enabled)
  const enabledMetrics = metrics.filter(m => m.enabled)
  const metricCategories = [...new Set(metrics.map(m => m.category))]

  const handleSaveDraft = () => {
    toast({ title: "Draft saved", description: `"${reportTitle}" has been saved as a draft.` })
    onClose()
  }

  const handleSend = () => {
    toast({ title: "Report generated", description: `"${reportTitle}" has been created and is ready for distribution.` })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center overflow-auto py-8">
      <div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Create Report</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Step {currentStep + 1} of {steps.length} -- {steps[currentStep]}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1 bg-transparent" onClick={handleSaveDraft}>
              <Save className="size-3" />
              Save Draft
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border/50">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => setCurrentStep(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  i === currentStep
                    ? "bg-primary text-primary-foreground"
                    : i < currentStep
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {i < currentStep ? <Check className="size-3" /> : <span className="size-3 text-center">{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < steps.length - 1 && <ChevronRight className="size-3 text-muted-foreground/50" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-5 min-h-[400px]">
          {currentStep === 0 && (
            <StepTemplateBasics
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              reportTitle={reportTitle}
              onTitleChange={setReportTitle}
              reportingPeriod={reportingPeriod}
              onPeriodChange={setReportingPeriod}
              fiscalYear={fiscalYear}
              onFiscalYearChange={setFiscalYear}
            />
          )}
          {currentStep === 1 && (
            <StepSections
              sections={sections}
              onToggle={toggleSection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            />
          )}
          {currentStep === 2 && (
            <StepMetrics
              metrics={metrics}
              categories={metricCategories}
              onToggle={toggleMetric}
            />
          )}
          {currentStep === 3 && (
            <StepPreview
              reportTitle={reportTitle}
              templateId={selectedTemplate}
              period={reportingPeriod}
              fiscalYear={fiscalYear}
              sections={enabledSections}
              metrics={enabledMetrics}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1 bg-transparent"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(s => s - 1)}
          >
            <ChevronLeft className="size-3.5" />
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button size="sm" className="text-xs h-8 gap-1" onClick={() => setCurrentStep(s => s + 1)}>
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" className="text-xs h-8 gap-1" onClick={handleSend}>
              <Send className="size-3.5" />
              Generate Report
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Step 1 ----------
function StepTemplateBasics({
  selectedTemplate, onSelectTemplate, reportTitle, onTitleChange, reportingPeriod, onPeriodChange, fiscalYear, onFiscalYearChange,
}: {
  selectedTemplate: string; onSelectTemplate: (v: string) => void
  reportTitle: string; onTitleChange: (v: string) => void
  reportingPeriod: string; onPeriodChange: (v: string) => void
  fiscalYear: string; onFiscalYearChange: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-xs font-medium text-foreground">Select Template</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {templateOptions.map(t => {
            const Icon = t.icon
            const selected = selectedTemplate === t.id
            return (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t.id)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className={`size-8 rounded-md flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary/10" : "bg-muted"}`}>
                  <Icon className={`size-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
                </div>
                {selected && <Check className="size-4 text-primary flex-shrink-0 mt-0.5" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="report-title" className="text-xs font-medium text-foreground">Report Title</Label>
          <Input id="report-title" value={reportTitle} onChange={e => onTitleChange(e.target.value)} className="mt-1.5 h-9 text-xs" placeholder="e.g., Q1 2026 Board Package" />
        </div>
        <div>
          <Label className="text-xs font-medium text-foreground">Reporting Period</Label>
          <Select value={reportingPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger className="mt-1.5 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="jan-2026" className="text-xs">January 2026</SelectItem>
              <SelectItem value="feb-2026" className="text-xs">February 2026</SelectItem>
              <SelectItem value="q1-2026" className="text-xs">Q1 2026</SelectItem>
              <SelectItem value="q4-2025" className="text-xs">Q4 2025</SelectItem>
              <SelectItem value="fy-2025" className="text-xs">FY 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium text-foreground">Fiscal Year</Label>
          <Select value={fiscalYear} onValueChange={onFiscalYearChange}>
            <SelectTrigger className="mt-1.5 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2026" className="text-xs">FY 2026</SelectItem>
              <SelectItem value="2025" className="text-xs">FY 2025</SelectItem>
              <SelectItem value="2024" className="text-xs">FY 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-foreground">Company Logo (optional)</Label>
        <div className="mt-1.5 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground/40 transition-colors cursor-pointer">
          <Upload className="size-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Drag and drop or click to upload</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG up to 2MB</p>
        </div>
      </div>
    </div>
  )
}

// ---------- Step 2 ----------
function StepSections({
  sections, onToggle, onDragStart, onDragOver, onDragEnd,
}: {
  sections: ReportSection[]
  onToggle: (id: string) => void
  onDragStart: (i: number) => void
  onDragOver: (e: React.DragEvent, i: number) => void
  onDragEnd: () => void
}) {
  const enabledCount = sections.filter(s => s.enabled).length
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">Configure Sections</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Toggle sections on/off and drag to reorder. {enabledCount} of {sections.length} enabled.</p>
        </div>
      </div>
      <div className="space-y-1">
        {sections.map((s, i) => (
          <div
            key={s.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDragEnd={onDragEnd}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-move ${
              s.enabled ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"
            }`}
          >
            <GripVertical className="size-3.5 text-muted-foreground/50 flex-shrink-0" />
            <Checkbox checked={s.enabled} onCheckedChange={() => onToggle(s.id)} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{s.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>
            </div>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 flex-shrink-0">
              {i + 1}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Step 3 ----------
function StepMetrics({
  metrics, categories, onToggle,
}: {
  metrics: MetricOption[]
  categories: string[]
  onToggle: (id: string) => void
}) {
  const enabledCount = metrics.filter(m => m.enabled).length
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-foreground">Select KPIs & Metrics</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{enabledCount} metrics selected. These will be highlighted in the report.</p>
      </div>
      {categories.map(cat => (
        <div key={cat}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {metrics.filter(m => m.category === cat).map(m => (
              <label
                key={m.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${
                  m.enabled ? "border-primary/30 bg-primary/5" : "border-border hover:bg-muted/30"
                }`}
              >
                <Checkbox checked={m.enabled} onCheckedChange={() => onToggle(m.id)} />
                <span className="text-xs text-foreground">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- Step 4 ----------
function StepPreview({
  reportTitle, templateId, period, fiscalYear, sections, metrics,
}: {
  reportTitle: string; templateId: string; period: string; fiscalYear: string
  sections: ReportSection[]; metrics: MetricOption[]
}) {
  const templateName = templateOptions.find(t => t.id === templateId)?.name || "Custom"
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Eye className="size-4 text-muted-foreground" />
        <p className="text-xs font-medium text-foreground">Report Preview</p>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{reportTitle}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{templateName}</Badge>
                <span className="text-[10px] text-muted-foreground">{period.toUpperCase()} / FY {fiscalYear}</span>
              </div>
            </div>
            <div className="size-10 rounded-md bg-muted flex items-center justify-center">
              <FileText className="size-5 text-muted-foreground" />
            </div>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sections ({sections.length})</p>
            <div className="space-y-1">
              {sections.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 py-1">
                  <span className="text-[10px] text-muted-foreground w-4 text-right tabular-nums">{i + 1}.</span>
                  <span className="text-xs text-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Metrics ({metrics.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {metrics.map(m => (
                <Badge key={m.id} variant="secondary" className="text-[10px] h-5 px-2">{m.label}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Distribution</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-foreground">Recipients</Label>
            <Input placeholder="Enter email addresses..." className="mt-1 h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs font-medium text-foreground">Schedule</Label>
            <Select defaultValue="now">
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="now" className="text-xs">Send Immediately</SelectItem>
                <SelectItem value="schedule" className="text-xs">Schedule for Later</SelectItem>
                <SelectItem value="draft" className="text-xs">Save as Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
