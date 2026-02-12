"use client"

import React from "react"

import { useState, useRef } from "react"
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type ImportStatus = "idle" | "selected" | "uploading" | "success" | "error"

export function ImportDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importType, setImportType] = useState("transactions")
  const [status, setStatus] = useState<ImportStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (!selected.name.endsWith(".csv")) {
        setErrorMessage("Only CSV files are supported")
        setStatus("error")
        return
      }
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMessage("File size must be under 10MB")
        setStatus("error")
        return
      }
      setFile(selected)
      setStatus("selected")
      setErrorMessage("")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      if (!dropped.name.endsWith(".csv")) {
        setErrorMessage("Only CSV files are supported")
        setStatus("error")
        return
      }
      setFile(dropped)
      setStatus("selected")
      setErrorMessage("")
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setStatus("uploading")
    try {
      // In production, this posts to /api/spreadsheet/import
      // For now, simulate a successful upload
      await new Promise(resolve => setTimeout(resolve, 1500))
      setStatus("success")
    } catch {
      setStatus("error")
      setErrorMessage("Failed to upload file. Please try again.")
    }
  }

  const reset = () => {
    setFile(null)
    setStatus("idle")
    setErrorMessage("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(reset, 200)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-transparent">
          <Upload className="size-3.5" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Import Data</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload a CSV file to import transactions or account data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Import Type</Label>
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transactions" className="text-xs">Transactions</SelectItem>
                <SelectItem value="accounts" className="text-xs">Accounts</SelectItem>
                <SelectItem value="budgets" className="text-xs">Budgets</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="size-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Import successful</p>
                <p className="text-xs text-muted-foreground mt-1">{file?.name} has been processed.</p>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              aria-label="Upload file area"
            >
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="size-8 text-primary/60" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-6 ml-2" onClick={e => { e.stopPropagation(); reset() }}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs font-medium text-foreground">Click to upload or drag and drop</p>
                  <p className="text-[10px] text-muted-foreground mt-1">CSV files only, max 10MB</p>
                </>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">
              <AlertCircle className="size-3.5 flex-shrink-0" />
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          {status === "success" ? (
            <Button size="sm" className="text-xs" onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={handleClose}>Cancel</Button>
              <Button size="sm" className="text-xs" disabled={!file || status === "uploading"} onClick={handleUpload}>
                {status === "uploading" ? "Importing..." : "Import"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
