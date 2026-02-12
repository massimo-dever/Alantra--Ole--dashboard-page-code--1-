"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { SyncStatusIndicator } from "@/components/integrations/sync-status-indicator"
import { SyncHistory } from "@/components/integrations/sync-history"
import { ImportDialog } from "@/components/spreadsheet/import-dialog"

export function SettingsView() {
  const [tab, setTab] = useState("profile")

  return (
    <div className="flex-1 overflow-auto p-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="organization" className="text-xs">Organization</TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs">Integrations</TabsTrigger>
          <TabsTrigger value="sync" className="text-xs">Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="organization">
          <OrgSettings />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationsSettings />
        </TabsContent>
        <TabsContent value="sync">
          <SyncSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileSettings() {
  const { toast } = useToast()
  const handleSave = () => {
    toast({ title: "Profile updated", description: "Your profile settings have been saved." })
  }
  return (
    <Card className="shadow-sm border-border max-w-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground">User Profile</CardTitle>
        <CardDescription className="text-xs">Manage your personal information and preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">First Name</Label>
            <Input defaultValue="John" className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Last Name</Label>
            <Input defaultValue="Doe" className="h-8 text-xs" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Email</Label>
          <Input defaultValue="john@alantra.com" type="email" className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Role</Label>
          <Input defaultValue="Admin" disabled className="h-8 text-xs bg-muted" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-medium">Email Notifications</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">Receive sync alerts and reports via email</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Default Currency</Label>
          <Select defaultValue="USD">
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD" className="text-xs">USD</SelectItem>
              <SelectItem value="EUR" className="text-xs">EUR</SelectItem>
              <SelectItem value="GBP" className="text-xs">GBP</SelectItem>
              <SelectItem value="CAD" className="text-xs">CAD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="text-xs" onClick={handleSave}>Save Changes</Button>
      </CardContent>
    </Card>
  )
}

function OrgSettings() {
  const { toast } = useToast()
  const handleSave = () => {
    toast({ title: "Organization updated", description: "Your organization settings have been saved." })
  }
  return (
    <Card className="shadow-sm border-border max-w-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground">Organization Settings</CardTitle>
        <CardDescription className="text-xs">Configure your organization details and preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Organization Name</Label>
          <Input defaultValue="Alantra Inc." className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Fiscal Year Start</Label>
          <Select defaultValue="january">
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="january" className="text-xs">January</SelectItem>
              <SelectItem value="april" className="text-xs">April</SelectItem>
              <SelectItem value="july" className="text-xs">July</SelectItem>
              <SelectItem value="october" className="text-xs">October</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Base Currency</Label>
          <Select defaultValue="USD">
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD" className="text-xs">USD</SelectItem>
              <SelectItem value="EUR" className="text-xs">EUR</SelectItem>
              <SelectItem value="GBP" className="text-xs">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-medium">Multi-Entity Mode</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">Enable tracking across multiple legal entities</p>
          </div>
          <Switch defaultChecked />
        </div>
        <Button size="sm" className="text-xs" onClick={handleSave}>Save Changes</Button>
      </CardContent>
    </Card>
  )
}

function IntegrationsSettings() {
  const connectors = [
    { id: "plaid", name: "Plaid", type: "Banking", status: "not_connected", description: "Connect bank accounts for automatic transaction sync" },
    { id: "stripe", name: "Stripe", type: "Payments", status: "not_connected", description: "Sync revenue and payment data from Stripe" },
    { id: "csv", name: "CSV Upload", type: "Manual", status: "available", description: "Import transactions from CSV files" },
  ]

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Data Sources</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Connect your financial accounts and data sources</p>
        </div>
        <ImportDialog />
      </div>
      <div className="space-y-3">
        {connectors.map(conn => (
          <Card key={conn.id} className="shadow-sm border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-xs font-bold text-muted-foreground">{conn.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{conn.name}</p>
                    <p className="text-xs text-muted-foreground">{conn.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    conn.status === "connected" ? "bg-green-100 text-green-700" :
                    conn.status === "available" ? "bg-blue-100 text-blue-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {conn.status === "connected" ? "Connected" : conn.status === "available" ? "Available" : "Not Connected"}
                  </span>
                  <Button variant="outline" size="sm" className="text-xs bg-transparent" disabled={conn.id !== "csv"}>
                    {conn.status === "connected" ? "Manage" : "Connect"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SyncSettings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <SyncStatusIndicator />
      <SyncHistory />
    </div>
  )
}
