"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Check, ChevronDown, ChevronUp, Bookmark, BookmarkPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type DrillDownOption =
  | "Account"
  | "Account Number"
  | "Account Name"
  | "Class"
  | "Location"
  | "Vendor Name"
  | "Revenue Stage"

interface FilterPreset {
  id: string
  name: string
  filters: DrillDownOption[]
}

interface DrillDownMenuProps {
  selectedFilters: DrillDownOption[]
  onFiltersChange: (filters: DrillDownOption[]) => void
  onClose: () => void
  onAccept: () => void
}

const filterOptions: DrillDownOption[] = [
  "Account",
  "Account Number",
  "Account Name",
  "Class",
  "Location",
  "Vendor Name",
  "Revenue Stage",
]

export function DrillDownMenu({ selectedFilters, onFiltersChange, onClose, onAccept }: DrillDownMenuProps) {
  const { toast } = useToast()
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [presetName, setPresetName] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("filter-presets")
    if (saved) {
      try {
        setPresets(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load presets", e)
      }
    }
  }, [])

  const handleToggle = (option: DrillDownOption) => {
    if (selectedFilters.includes(option)) {
      onFiltersChange(selectedFilters.filter((f) => f !== option))
    } else {
      onFiltersChange([...selectedFilters, option])
    }
  }

  const handleSelectAll = () => {
    onFiltersChange([...filterOptions])
  }

  const handleSelectNone = () => {
    onFiltersChange([])
  }

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this filter preset",
        variant: "destructive",
      })
      return
    }

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: [...selectedFilters],
    }

    const updated = [...presets, newPreset]
    setPresets(updated)
    localStorage.setItem("filter-presets", JSON.stringify(updated))
    setPresetName("")
    setShowSaveDialog(false)
    toast({
      title: "Preset saved",
      description: `Filter preset "${newPreset.name}" has been saved`,
    })
  }

  const handleLoadPreset = (preset: FilterPreset) => {
    onFiltersChange(preset.filters)
    toast({
      title: "Preset loaded",
      description: `Loaded filter preset "${preset.name}"`,
    })
  }

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = presets.filter((p) => p.id !== id)
    setPresets(updated)
    localStorage.setItem("filter-presets", JSON.stringify(updated))
    toast({
      title: "Preset deleted",
      description: "Filter preset has been removed",
    })
  }

  return (
    <div className="w-[280px] bg-card rounded-lg shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="px-3 py-2 border-b border-border/50 bg-muted/50 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Drill down by</span>
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
              <BookmarkPlus className="size-3.5 text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Filter Preset</DialogTitle>
              <DialogDescription>Save your current filter selection for quick access later</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Preset name (e.g., 'Vendor Details')"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSavePreset()
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreset}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {presets.length > 0 && (
        <div className="px-2 py-2 border-b border-border/50 bg-muted/30">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 px-2">Saved Presets</div>
          <div className="space-y-1 max-h-[100px] overflow-y-auto">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer group"
                onClick={() => handleLoadPreset(preset)}
              >
                <Bookmark className="size-3 text-muted-foreground" />
                <span className="text-xs text-foreground/80 flex-1 truncate">{preset.name}</span>
                <button
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-2">
        <div className="flex items-center justify-between px-2 mb-2 text-[10px] text-primary font-medium">
          <span className="cursor-pointer hover:underline" onClick={handleSelectAll}>
            All
          </span>
          <span className="cursor-pointer hover:underline" onClick={handleSelectNone}>
            None
          </span>
        </div>

        <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
          {filterOptions.map((option) => (
            <MenuItem
              key={option}
              label={option}
              checked={selectedFilters.includes(option)}
              onToggle={() => handleToggle(option)}
            />
          ))}
        </div>
      </div>

      <div className="p-2 border-t border-border/50 flex items-center justify-between bg-muted/50">
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={onClose}>
          Close
        </Button>
        <Button size="sm" className="h-7 text-xs px-4" onClick={onAccept}>
          Accept
        </Button>
      </div>
    </div>
  )
}

function MenuItem({ label, checked, onToggle }: { label: string; checked?: boolean; onToggle: () => void }) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded cursor-pointer group"
      onClick={onToggle}
    >
      <div
        className={`size-3.5 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-input bg-background"}`}
      >
        {checked && <Check className="size-2.5 text-primary-foreground" />}
      </div>
      <span className="text-xs text-foreground/80 group-hover:text-foreground">{label}</span>
      <div className="ml-auto flex flex-col -space-y-1 opacity-0 group-hover:opacity-100">
        <ChevronUp className="size-2 text-muted-foreground" />
        <ChevronDown className="size-2 text-muted-foreground" />
      </div>
    </div>
  )
}
