"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { StorageUnit } from "@/lib/storage-utils"

interface SubscriptionPrice {
  id: string
  plan_id: string
  billing_cycle: "monthly" | "yearly"
  price: number
  stripe_price_id: string | null
  trial_days: number
  is_active: boolean
}

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  max_screens: number
  free_screens: number
  max_media_storage: number
  max_file_upload_size?: number
  storage_unit?: StorageUnit
  max_playlists: number
  max_locations?: number
  max_schedules?: number
  max_team_members?: number
  is_active: boolean
  display_branding?: boolean
  stripe_product_id: string | null
  subscriber_count?: number
  created_at: string
  // Prices from subscription_prices table
  prices?: SubscriptionPrice[]
  // Feature permissions from feature_permissions table
  feature_permissions?: { feature_key: string; is_enabled: boolean }[]
  // Computed from prices for display
  monthly_price?: number
  yearly_price?: number
}

interface PlanFormData {
  name: string
  description: string
  monthly_price: string
  yearly_price: string
  trial_days: string
  max_screens: string
  free_screens: string
  max_media_storage: string
  max_file_upload_size: string
  storage_unit: string
  max_playlists: string
  max_locations: string
  max_schedules: string
  max_team_members: string
  is_active: boolean
  // Feature toggles - control navigation visibility
  enable_media_library: boolean
  enable_playlists: boolean
  enable_screens: boolean
  enable_locations: boolean
  enable_schedules: boolean
  enable_analytics: boolean
  enable_ai_analytics: boolean
  enable_team_members: boolean
  enable_url_media: boolean
  enable_display_branding: boolean
}

export function PlanManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null)
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [formData, setFormData] = useState<PlanFormData>({
    name: "",
    description: "",
    monthly_price: "0",
    yearly_price: "0",
    trial_days: "0",
    max_screens: "1",
    free_screens: "0",
    max_media_storage: "1",
    max_file_upload_size: "10",
    storage_unit: "GB",
    max_playlists: "1",
    max_locations: "1",
    max_schedules: "1",
    max_team_members: "0",
    is_active: true,
    enable_media_library: true,
    enable_playlists: true,
    enable_screens: true,
    enable_locations: false,
    enable_schedules: false,
    enable_analytics: false,
    enable_ai_analytics: false,
    enable_team_members: false,
    enable_url_media: true,
    enable_display_branding: true,
  })
  const { toast } = useToast()

  const convertStorageToDisplayValue = (bytes: number, unit = "GB"): number => {
    switch (unit.toUpperCase()) {
      case "MB":
        return Math.round(bytes / (1024 * 1024))
      case "GB":
        return Math.round(bytes / (1024 * 1024 * 1024))
      case "TB":
        return Math.round(bytes / (1024 * 1024 * 1024 * 1024))
      default:
        return bytes
    }
  }

  const convertDisplayValueToBytes = (value: number, unit = "GB"): number => {
    switch (unit.toUpperCase()) {
      case "MB":
        return value * 1024 * 1024
      case "GB":
        return value * 1024 * 1024 * 1024
      case "TB":
        return value * 1024 * 1024 * 1024 * 1024
      default:
        return value
    }
  }

  useEffect(() => {
    fetchPlans()

    // Refetch plans when the user returns to this page/tab
    const handleFocus = () => fetchPlans()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans")
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch subscription plans",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching plans:", error)
      toast({
        title: "Error",
        description: "Failed to fetch subscription plans",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async () => {
    try {
      const storageInBytes = convertDisplayValueToBytes(
        Number.parseInt(formData.max_media_storage),
        formData.storage_unit,
      )

      const fileUploadInBytes = convertDisplayValueToBytes(
        Number.parseInt(formData.max_file_upload_size),
        formData.storage_unit,
      )

      const planData = {
        name: formData.name,
        description: formData.description,
        monthly_price: Number.parseFloat(formData.monthly_price),
        yearly_price: Number.parseFloat(formData.yearly_price),
        trial_days: Number.parseInt(formData.trial_days),
        max_screens: formData.max_screens === "-1" ? -1 : Number.parseInt(formData.max_screens),
        free_screens: Number.parseInt(formData.free_screens) || 0,
        max_media_storage: storageInBytes,
        max_file_upload_size: fileUploadInBytes,
        storage_unit: formData.storage_unit,
        max_playlists: formData.max_playlists === "-1" ? -1 : Number.parseInt(formData.max_playlists),
        max_locations: formData.max_locations === "-1" ? -1 : Number.parseInt(formData.max_locations),
        max_schedules: formData.max_schedules === "-1" ? -1 : Number.parseInt(formData.max_schedules),
        max_team_members: formData.max_team_members === "-1" ? -1 : Number.parseInt(formData.max_team_members),
        is_active: formData.is_active,
        display_branding: formData.enable_display_branding,
        // Feature toggles
        features: {
          media_library: formData.enable_media_library,
          playlists: formData.enable_playlists,
          screens: formData.enable_screens,
          locations: formData.enable_locations,
          schedules: formData.enable_schedules,
          analytics: formData.enable_analytics,
          ai_analytics: formData.enable_ai_analytics,
          team_members: formData.enable_team_members,
          url_media: formData.enable_url_media,
          display_branding: formData.enable_display_branding,
        },
      }

      const response = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      })

      if (response.ok) {
        await fetchPlans()
        setShowCreateDialog(false)
        resetForm()
        toast({
          title: "Success",
          description: "Subscription plan created successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to create plan",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating plan:", error)
      toast({
        title: "Error",
        description: "Failed to create plan",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePlan = async () => {
    if (!editingPlan) return

    try {
      const storageInBytes = convertDisplayValueToBytes(
        Number.parseInt(formData.max_media_storage),
        formData.storage_unit,
      )

      const fileUploadInBytes = convertDisplayValueToBytes(
        Number.parseInt(formData.max_file_upload_size),
        formData.storage_unit,
      )

      const planData = {
        name: formData.name,
        description: formData.description,
        monthly_price: Number.parseFloat(formData.monthly_price),
        yearly_price: Number.parseFloat(formData.yearly_price),
        trial_days: Number.parseInt(formData.trial_days),
        max_screens: formData.max_screens === "-1" ? -1 : Number.parseInt(formData.max_screens),
        free_screens: Number.parseInt(formData.free_screens) || 0,
        max_media_storage: storageInBytes,
        max_file_upload_size: fileUploadInBytes,
        storage_unit: formData.storage_unit,
        max_playlists: formData.max_playlists === "-1" ? -1 : Number.parseInt(formData.max_playlists),
        max_locations: formData.max_locations === "-1" ? -1 : Number.parseInt(formData.max_locations),
        max_schedules: formData.max_schedules === "-1" ? -1 : Number.parseInt(formData.max_schedules),
        max_team_members: formData.max_team_members === "-1" ? -1 : Number.parseInt(formData.max_team_members),
        is_active: formData.is_active,
        display_branding: formData.enable_display_branding,
        // Feature toggles
        features: {
          media_library: formData.enable_media_library,
          playlists: formData.enable_playlists,
          screens: formData.enable_screens,
          locations: formData.enable_locations,
          schedules: formData.enable_schedules,
          analytics: formData.enable_analytics,
          ai_analytics: formData.enable_ai_analytics,
          team_members: formData.enable_team_members,
          url_media: formData.enable_url_media,
          display_branding: formData.enable_display_branding,
        },
      }

      const response = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      })

      if (response.ok) {
        await fetchPlans()
        setEditingPlan(null)
        setIsPlanDialogOpen(false)
        resetForm()
        toast({
          title: "Success",
          description: "Subscription plan updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update plan",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update plan",
        variant: "destructive",
      })
    }
  }

  const handleDeletePlan = async (planId: string) => {
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchPlans()
        setDeletingPlan(null)
        setDeleteConfirmation("")
        toast({
          title: "Success",
          description: "Subscription plan deleted successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to delete plan",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      monthly_price: "0",
      yearly_price: "0",
      trial_days: "0",
      max_screens: "1",
      free_screens: "0",
      max_media_storage: "1",
      max_file_upload_size: "10",
      storage_unit: "GB",
      max_playlists: "1",
      max_locations: "1",
      max_schedules: "1",
      max_team_members: "0",
      is_active: true,
      enable_media_library: true,
      enable_playlists: true,
      enable_screens: true,
      enable_locations: false,
      enable_schedules: false,
      enable_analytics: false,
      enable_ai_analytics: false,
      enable_team_members: false,
      enable_url_media: true,
    })
  }

  const openEditDialog = (plan: SubscriptionPlan) => {
    const displayValue = convertStorageToDisplayValue(plan.max_media_storage, plan.storage_unit)
    const fileUploadValue = convertStorageToDisplayValue(plan.max_file_upload_size || 10737418240, plan.storage_unit)

    // Extract monthly and yearly prices from the prices array
    const monthlyPrice = plan.prices?.find((p) => p.billing_cycle === "monthly")?.price || plan.monthly_price || 0
    const yearlyPrice = plan.prices?.find((p) => p.billing_cycle === "yearly")?.price || plan.yearly_price || 0
    const trialDays = plan.prices?.[0]?.trial_days || 0

    // Use feature permissions already loaded in the plan object from fetchPlans
    const features: any = {}
    if (plan.feature_permissions) {
      plan.feature_permissions.forEach((fp: any) => {
        features[fp.feature_key] = fp.is_enabled
      })
    }

    setFormData({
      name: plan.name,
      description: plan.description,
      monthly_price: monthlyPrice.toString(),
      yearly_price: yearlyPrice.toString(),
      trial_days: trialDays.toString(),
      max_screens: plan.max_screens.toString(),
      free_screens: (plan.free_screens ?? 0).toString(),
      max_media_storage: displayValue.toString(),
      max_file_upload_size: fileUploadValue.toString(),
      storage_unit: plan.storage_unit || "GB",
      max_playlists: plan.max_playlists.toString(),
      max_locations: (plan.max_locations ?? 1).toString(),
      max_schedules: (plan.max_schedules ?? 1).toString(),
      max_team_members: (plan.max_team_members ?? 0).toString(),
      is_active: plan.is_active,
      enable_media_library: features.media_library ?? true,
      enable_playlists: features.playlists ?? true,
      enable_screens: features.screens ?? true,
      enable_locations: features.locations ?? false,
      enable_schedules: features.schedules ?? false,
      enable_analytics: features.analytics ?? false,
      enable_ai_analytics: features.ai_analytics ?? false,
      enable_team_members: features.team_members ?? false,
      enable_url_media: features.url_media ?? true,
      enable_display_branding: plan.display_branding ?? false,
    })
    setEditingPlan(plan)
    setIsPlanDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getPlanPrice = (plan: SubscriptionPlan, cycle: "monthly" | "yearly") => {
    const price = plan.prices?.find((p) => p.billing_cycle === cycle)?.price
    if (price !== undefined) return price
    return cycle === "monthly" ? plan.monthly_price || 0 : plan.yearly_price || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Plan Management</h1>
          <p className="text-muted-foreground mt-1">Manage subscription plans and pricing</p>
        </div>
        <Button onClick={() => setIsPlanDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans
          .filter((plan) => plan.is_active)
          .map((plan) => (
            <Card key={plan.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <Badge className="bg-emerald-500 text-white">Active</Badge>
                </div>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {formatCurrency(getPlanPrice(plan, "monthly"))}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <div className="text-lg text-muted-foreground">
                    {formatCurrency(getPlanPrice(plan, "yearly"))}
                    <span className="text-sm font-normal">/year</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Screens:</span>
                    <span className="font-medium">{plan.max_screens === -1 ? "Unlimited" : plan.max_screens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Free Screens:</span>
                    <span className="font-medium">{plan.free_screens ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage:</span>
                    <span className="font-medium">
                      {convertStorageToDisplayValue(plan.max_media_storage, plan.storage_unit)}{" "}
                      {plan.storage_unit || "GB"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Playlists:</span>
                    <span className="font-medium">{plan.max_playlists === -1 ? "Unlimited" : plan.max_playlists}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team Members:</span>
                    <span className="font-medium">{plan.max_team_members === -1 ? "Unlimited" : (plan.max_team_members ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subscribers:</span>
                    <span className="font-medium">{plan.subscriber_count || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => openEditDialog(plan)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingPlan(plan)}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
          <CardDescription>Detailed view of all subscription plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Monthly Price</TableHead>
                  <TableHead>Yearly Price</TableHead>
                  <TableHead>Max Screens</TableHead>
                  <TableHead>Free Screens</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Max Playlists</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{formatCurrency(getPlanPrice(plan, "monthly"))}</TableCell>
                    <TableCell>{formatCurrency(getPlanPrice(plan, "yearly"))}</TableCell>
                    <TableCell>{plan.max_screens === -1 ? "Unlimited" : plan.max_screens}</TableCell>
                    <TableCell>{plan.free_screens ?? 0}</TableCell>
                    <TableCell>
                      {convertStorageToDisplayValue(plan.max_media_storage, plan.storage_unit)}{" "}
                      {plan.storage_unit || "GB"}
                    </TableCell>
                    <TableCell>{plan.max_playlists === -1 ? "Unlimited" : plan.max_playlists}</TableCell>
                    <TableCell>{plan.max_team_members === -1 ? "Unlimited" : (plan.max_team_members ?? 0)}</TableCell>
                    <TableCell>{plan.subscriber_count || 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={plan.is_active ? "default" : "secondary"}
                        className={plan.is_active ? "bg-emerald-500" : ""}
                      >
                        {plan.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(plan)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeletingPlan(plan)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isPlanDialogOpen}
        onOpenChange={setIsPlanDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? "Update plan details and pricing" : "Add a new subscription plan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Pro Plan"
                />
              </div>
              <div>
                <Label>Trial Period (Days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.trial_days}
                  onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                  placeholder="e.g., 14"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Plan description..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Pricing</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Monthly Price (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthly_price}
                    onChange={(e) => setFormData({ ...formData, monthly_price: e.target.value })}
                    placeholder="29.00"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Yearly Price (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.yearly_price}
                    onChange={(e) => setFormData({ ...formData, yearly_price: e.target.value })}
                    placeholder="290.00"
                  />
                  {formData.monthly_price && formData.yearly_price && Number(formData.yearly_price) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((1 - Number(formData.yearly_price) / (Number(formData.monthly_price) * 12)) * 100)}%
                      savings vs monthly
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active Plan</Label>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Plan Limits & Features</Label>
                <p className="text-xs text-muted-foreground">Use -1 for unlimited. Toggle controls navigation visibility.</p>
              </div>

              {/* Media Library */}
              <div className="space-y-3 pb-4 border-b">
                <Label className="text-lg font-medium">Media Library</Label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Max Storage</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="-1"
                        value={formData.max_media_storage}
                        onChange={(e) => setFormData({ ...formData, max_media_storage: e.target.value })}
                        className="flex-1"
                      />
                      <Select
                        value={formData.storage_unit}
                        onValueChange={(value) => setFormData({ ...formData, storage_unit: value })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MB">MB</SelectItem>
                          <SelectItem value="GB">GB</SelectItem>
                          <SelectItem value="TB">TB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable On This Plan</Label>
                      <Switch
                        checked={formData.enable_media_library}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_media_library: checked })}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">File Upload Limit</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={formData.max_file_upload_size}
                        onChange={(e) => setFormData({ ...formData, max_file_upload_size: e.target.value })}
                        className="flex-1"
                      />
                      <div className="w-20 flex items-center justify-center text-sm text-muted-foreground">GB</div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable URL Media</Label>
                      <Switch
                        checked={formData.enable_url_media}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_url_media: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Playlists */}
              <div className="space-y-3 pb-4 border-b">
                <Label className="text-lg font-medium">Playlists</Label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Max Playlists</Label>
                    <Input
                      type="number"
                      min="-1"
                      value={formData.max_playlists}
                      onChange={(e) => setFormData({ ...formData, max_playlists: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable On This Plan</Label>
                      <Switch
                        checked={formData.enable_playlists}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_playlists: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Screens */}
              <div className="space-y-3 pb-4 border-b">
                <Label className="text-lg font-medium">Screens</Label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Max Screens</Label>
                    <Input
                      type="number"
                      min="-1"
                      value={formData.max_screens}
                      onChange={(e) => setFormData({ ...formData, max_screens: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable On This Plan</Label>
                      <Switch
                        checked={formData.enable_screens}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_screens: checked })}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Free Screens</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.free_screens}
                      onChange={(e) => setFormData({ ...formData, free_screens: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Screens included at no charge. Screens above this number are billed via Stripe.
                    </p>
                  </div>
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-3 pb-4 border-b">
                <Label className="text-lg font-medium">Locations</Label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Max Locations</Label>
                    <Input
                      type="number"
                      min="-1"
                      value={formData.max_locations}
                      onChange={(e) => setFormData({ ...formData, max_locations: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable On This Plan</Label>
                      <Switch
                        checked={formData.enable_locations}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_locations: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedules */}
              <div className="space-y-3 pb-4 border-b">
                <Label className="text-lg font-medium">Schedules</Label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Max Schedules</Label>
                    <Input
                      type="number"
                      min="-1"
                      value={formData.max_schedules}
                      onChange={(e) => setFormData({ ...formData, max_schedules: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable On This Plan</Label>
                      <Switch
                        checked={formData.enable_schedules}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_schedules: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="space-y-3 pb-4 border-b">
                <Label className="text-lg font-medium">Analytics</Label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Enable On This Plan</Label>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable On This Plan</Label>
                      <Switch
                        checked={formData.enable_analytics}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_analytics: checked })}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">AI Analytics</Label>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable On This Plan</Label>
                      <Switch
                        checked={formData.enable_ai_analytics}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_ai_analytics: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="space-y-3 pb-4 border-b">
                <Label className="text-lg font-medium">Team Members</Label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Max Team Members</Label>
                    <Input
                      type="number"
                      min="-1"
                      value={formData.max_team_members}
                      onChange={(e) => setFormData({ ...formData, max_team_members: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable On This Plan</Label>
                      <Switch
                        checked={formData.enable_team_members}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_team_members: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Branding */}
              <div className="space-y-3 pb-4">
                <Label className="text-lg font-medium">Branding</Label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Display Xkreen Logo on Player</Label>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Enable On This Plan</Label>
                      <Switch
                        checked={formData.enable_display_branding}
                        onCheckedChange={(checked) => setFormData({ ...formData, enable_display_branding: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPlanDialogOpen(false)
                setEditingPlan(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}>
              {editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the "{deletingPlan?.name}" plan? This action cannot be undone.
              {(deletingPlan?.subscriber_count || 0) > 0 && (
                <span className="block mt-2 text-red-500">
                  Warning: This plan has {deletingPlan?.subscriber_count} active subscriber(s).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type "{deletingPlan?.name}" to confirm</Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={deletingPlan?.name}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPlan(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingPlan && handleDeletePlan(deletingPlan.id)}
              disabled={deleteConfirmation !== deletingPlan?.name}
            >
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
