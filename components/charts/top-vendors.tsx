"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Search, ArrowUpDown, Download, ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"

interface TopVendorsTableProps {
  appliedFilters?: string[]
}

type SortField =
  | "dept"
  | "name"
  | "account"
  | "location"
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
type SortDirection = "asc" | "desc" | null

const vendorsData = [
  {
    dept: "Product",
    name: "Peak Performance Partners",
    account: "Professional Services",
    accountNumber: "6001",
    accountName: "Consulting Fees",
    class: "External",
    location: "New York",
    revenueStage: "Closed Won",
    jan: "1,381",
    feb: "805",
    mar: "1,090",
    apr: "1,200",
    may: "-",
    jun: "702",
    jul: "1,187",
    aug: "1,623",
    sep: "-",
    oct: "698",
    nov: "5,240",
  },
  {
    dept: "Marketing",
    name: "Catalyst Consulting Co.",
    account: "Marketing Services",
    accountNumber: "6002",
    accountName: "Advertising",
    class: "External",
    location: "San Francisco",
    revenueStage: "Negotiation",
    jan: "793",
    feb: "1,683",
    mar: "2,188",
    apr: "840",
    may: "1,021",
    jun: "3,218",
    jul: "2,292",
    aug: "1,620",
    sep: "653",
    oct: "505",
    nov: "5,115",
  },
  {
    dept: "Product",
    name: "Momentum Market Consultants",
    account: "Professional Services",
    accountNumber: "6003",
    accountName: "Market Research",
    class: "External",
    location: "Boston",
    revenueStage: "Closed Won",
    jan: "1,262",
    feb: "800",
    mar: "1,975",
    apr: "198",
    may: "1,010",
    jun: "1,733",
    jul: "1,353",
    aug: "1,471",
    sep: "607",
    oct: "555",
    nov: "4,923",
  },
  {
    dept: "Product",
    name: "Thrive Thought Leaders",
    account: "Professional Services",
    accountNumber: "6001",
    accountName: "Consulting Fees",
    class: "Internal",
    location: "Chicago",
    revenueStage: "Prospecting",
    jan: "726",
    feb: "723",
    mar: "1,389",
    apr: "1,197",
    may: "414",
    jun: "940",
    jul: "1,004",
    aug: "254",
    sep: "603",
    oct: "883",
    nov: "4,804",
  },
  {
    dept: "Product",
    name: "Nexus Navigators",
    account: "Technology Services",
    accountNumber: "6004",
    accountName: "Software Development",
    class: "External",
    location: "Seattle",
    revenueStage: "Closed Won",
    jan: "903",
    feb: "544",
    mar: "1,174",
    apr: "267",
    may: "1,150",
    jun: "1,259",
    jul: "641",
    aug: "849",
    sep: "905",
    oct: "1,414",
    nov: "4,467",
  },
  {
    dept: "Marketing",
    name: "Visionary Venture Advisors",
    account: "Marketing Services",
    accountNumber: "6005",
    accountName: "Brand Strategy",
    class: "External",
    location: "Los Angeles",
    revenueStage: "Closed Won",
    jan: "3,396",
    feb: "3,354",
    mar: "5,224",
    apr: "1,131",
    may: "984",
    jun: "2,488",
    jul: "2,908",
    aug: "1,262",
    sep: "3,391",
    oct: "1,697",
    nov: "4,428",
  },
  {
    dept: "Product",
    name: "Blueprint Business Solutions",
    account: "Professional Services",
    accountNumber: "6006",
    accountName: "Business Analysis",
    class: "External",
    location: "Austin",
    revenueStage: "Negotiation",
    jan: "172",
    feb: "-",
    mar: "439",
    apr: "799",
    may: "407",
    jun: "1,906",
    jul: "828",
    aug: "596",
    sep: "1,255",
    oct: "1,587",
    nov: "4,202",
  },
]

export function TopVendorsTable({ appliedFilters = [] }: TopVendorsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const { toast } = useToast()

  const showAccount = appliedFilters.includes("Account")
  const showAccountNumber = appliedFilters.includes("Account Number")
  const showAccountName = appliedFilters.includes("Account Name")
  const showClass = appliedFilters.includes("Class")
  const showLocation = appliedFilters.includes("Location")
  const showVendorName = appliedFilters.includes("Vendor Name")
  const showRevenueStage = appliedFilters.includes("Revenue Stage")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredAndSortedData = useMemo(() => {
    let filtered = vendorsData.filter((vendor) => {
      const searchLower = searchQuery.toLowerCase()
      return (
        vendor.dept.toLowerCase().includes(searchLower) ||
        vendor.name.toLowerCase().includes(searchLower) ||
        vendor.account.toLowerCase().includes(searchLower) ||
        vendor.location.toLowerCase().includes(searchLower) ||
        (vendor.accountName && vendor.accountName.toLowerCase().includes(searchLower))
      )
    })

    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number = a[sortField]
        let bValue: string | number = b[sortField]

        if (["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov"].includes(sortField)) {
          aValue = aValue === "-" ? 0 : Number.parseFloat(aValue.replace(/,/g, ""))
          bValue = bValue === "-" ? 0 : Number.parseFloat(bValue.replace(/,/g, ""))
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [searchQuery, sortField, sortDirection])

  const handleExport = () => {
    const headers = [
      "Department",
      ...(showAccount ? ["Account"] : []),
      ...(showAccountNumber ? ["Account #"] : []),
      ...(showAccountName ? ["Account Name"] : []),
      ...(showClass ? ["Class"] : []),
      ...(showLocation ? ["Location"] : []),
      ...(showVendorName ? ["Vendor Name"] : []),
      ...(showRevenueStage ? ["Revenue Stage"] : []),
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
    ]

    const rows = filteredAndSortedData.map((vendor) => [
      vendor.dept,
      ...(showAccount ? [vendor.account] : []),
      ...(showAccountNumber ? [vendor.accountNumber] : []),
      ...(showAccountName ? [vendor.accountName] : []),
      ...(showClass ? [vendor.class] : []),
      ...(showLocation ? [vendor.location] : []),
      ...(showVendorName ? [vendor.name] : []),
      ...(showRevenueStage ? [vendor.revenueStage] : []),
      vendor.jan,
      vendor.feb,
      vendor.mar,
      vendor.apr,
      vendor.may,
      vendor.jun,
      vendor.jul,
      vendor.aug,
      vendor.sep,
      vendor.oct,
      vendor.nov,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `top-vendors-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export successful",
      description: "Vendor data has been exported to CSV",
    })
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field
    const direction = isActive ? sortDirection : null

    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        <span className="flex items-center">
          {direction === "asc" && <ArrowUp className="size-3" />}
          {direction === "desc" && <ArrowDown className="size-3" />}
          {!direction && <ArrowUpDown className="size-3 opacity-30" />}
        </span>
      </button>
    )
  }

  return (
    <TooltipProvider>
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Top Vendors</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExport} className="h-8 gap-2 bg-transparent">
                  <Download className="size-4" />
                  Export CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download table data as CSV</TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="w-[100px] text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="dept">Department</SortButton>
                  </TableHead>
                  {showAccount && (
                    <TableHead className="text-xs font-medium text-muted-foreground h-9">
                      <SortButton field="account">Account</SortButton>
                    </TableHead>
                  )}
                  {showAccountNumber && (
                    <TableHead className="text-xs font-medium text-muted-foreground h-9">Account #</TableHead>
                  )}
                  {showAccountName && (
                    <TableHead className="text-xs font-medium text-muted-foreground h-9">Account Name</TableHead>
                  )}
                  {showClass && <TableHead className="text-xs font-medium text-muted-foreground h-9">Class</TableHead>}
                  {showLocation && (
                    <TableHead className="text-xs font-medium text-muted-foreground h-9">
                      <SortButton field="location">Location</SortButton>
                    </TableHead>
                  )}
                  {showVendorName && (
                    <TableHead className="min-w-[200px] text-xs font-medium text-muted-foreground h-9">
                      <SortButton field="name">Vendor Name</SortButton>
                    </TableHead>
                  )}
                  {showRevenueStage && (
                    <TableHead className="text-xs font-medium text-muted-foreground h-9">Revenue Stage</TableHead>
                  )}
                  <TableHead className="text-xs font-medium text-muted-foreground h-9">Month</TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="jan">2024-01-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="feb">2024-02-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="mar">2024-03-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="apr">2024-04-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="may">2024-05-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="jun">2024-06-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="jul">2024-07-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="aug">2024-08-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="sep">2024-09-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="oct">2024-10-01</SortButton>
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-muted-foreground h-9">
                    <SortButton field="nov">2024-11-01</SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                      No vendors found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedData.map((vendor, i) => (
                    <TableRow key={i} className="hover:bg-muted/50 border-b border-border/30 text-xs">
                      <TableCell className="font-medium text-foreground/80 py-2">{vendor.dept}</TableCell>
                      {showAccount && <TableCell className="text-foreground/80 py-2">{vendor.account}</TableCell>}
                      {showAccountNumber && (
                        <TableCell className="text-foreground/80 py-2">{vendor.accountNumber}</TableCell>
                      )}
                      {showAccountName && <TableCell className="text-foreground/80 py-2">{vendor.accountName}</TableCell>}
                      {showClass && <TableCell className="text-foreground/80 py-2">{vendor.class}</TableCell>}
                      {showLocation && <TableCell className="text-foreground/80 py-2">{vendor.location}</TableCell>}
                      {showVendorName && <TableCell className="text-foreground/80 py-2">{vendor.name}</TableCell>}
                      {showRevenueStage && <TableCell className="text-foreground/80 py-2">{vendor.revenueStage}</TableCell>}
                      <TableCell className="text-foreground/80 py-2" />
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.jan}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.feb}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.mar}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.apr}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.may}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.jun}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.jul}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.aug}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.sep}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.oct}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{vendor.nov}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
