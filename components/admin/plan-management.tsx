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
import type { StorageUnit } from "@/lib/storage-utils"

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  billing_cycle: "monthly" | "yearly"
  max_screens: number
  max_media_storage: number
  storage_unit?: StorageUnit // Add storage_unit field
  max_playlists: number
  is_active: boolean
  subscriber_count?: number
  created_at: string
}

interface PlanFormData {
  name: string
  description: string
  price: string
  billing_cycle: "monthly" | "yearly"
  max_screens: string
  max_media_storage: string // Now stores just the integer value
  storage_unit: string // Added storage unit field
  max_playlists: string
  is_active: boolean
}

export function PlanManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [formData, setFormData] = useState<PlanFormData>({
    name: "",
    description: "",
    price: "0",
    billing_cycle: "monthly",
    max_screens: "1",
    max_media_storage: "1", // Just the integer value
    storage_unit: "GB", // Default unit
    max_playlists: "1",
    is_active: true,
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

      const planData = {
        ...formData,
        price: Number.parseFloat(formData.price),
        max_screens: formData.max_screens === "-1" ? -1 : Number.parseInt(formData.max_screens),
        max_media_storage: storageInBytes, // Store as bytes
        storage_unit: formData.storage_unit,
        max_playlists: formData.max_playlists === "-1" ? -1 : Number.parseInt(formData.max_playlists),
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

      const planData = {
        ...formData,
        price: Number.parseFloat(formData.price),
        max_screens: formData.max_screens === "-1" ? -1 : Number.parseInt(formData.max_screens),
        max_media_storage: storageInBytes, // Store as bytes
        storage_unit: formData.storage_unit,
        max_playlists: formData.max_playlists === "-1" ? -1 : Number.parseInt(formData.max_playlists),
      }

      const response = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      })

      if (response.ok) {
        await fetchPlans()
        setEditingPlan(null)
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
      price: "0",
      billing_cycle: "monthly",
      max_screens: "1",
      max_media_storage: "1", // Just integer
      storage_unit: "GB", // Default unit
      max_playlists: "1",
      is_active: true,
    })
  }

  const openEditDialog = (plan: SubscriptionPlan) => {
    const displayValue = convertStorageToDisplayValue(plan.max_media_storage, plan.storage_unit)

    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      billing_cycle: plan.billing_cycle,
      max_screens: plan.max_screens.toString(),
      max_media_storage: displayValue.toString(), // Use converted display value
      storage_unit: plan.storage_unit || "GB",
      max_playlists: plan.max_playlists.toString(),
      is_active: plan.is_active,
    })
    setEditingPlan(plan)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
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
        <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-500 hover:bg-emerald-600">
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
                <div>
                  <div className="text-3xl font-bold">
                    {formatCurrency(plan.price)}
                    <span className="text-sm font-normal text-muted-foreground">/monthly</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Screens:</span>
                    <span className="font-medium">{plan.max_screens}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Storage:</span>
                    <span className="font-medium">
                      {convertStorageToDisplayValue(plan.max_media_storage, plan.storage_unit)}{" "}
                      {plan.storage_unit || "GB"}
                    </span>{" "}
                    {/* Display integer + unit */}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Playlists:</span>
                    <span className="font-medium">{plan.max_playlists}</span> {/* Use dedicated column */}
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
                  <TableHead>Price</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Max Screens</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Max Playlists</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{formatCurrency(plan.price)}</TableCell>
                    <TableCell className="capitalize">{plan.billing_cycle}</TableCell>
                    <TableCell>{plan.max_screens}</TableCell>
                    <TableCell>
                      {convertStorageToDisplayValue(plan.max_media_storage, plan.storage_unit)}{" "}
                      {plan.storage_unit || "GB"}
                    </TableCell>{" "}
                    {/* Display integer + unit */}
                    <TableCell>{plan.max_playlists}</TableCell> {/* Use dedicated column */}
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

      {/* Create/Edit Plan Dialog */}
      <Dialog
        open={showCreateDialog || !!editingPlan}
        onOpenChange={() => {
          setShowCreateDialog(false)
          setEditingPlan(null)
          resetForm()
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? "Update plan details and pricing" : "Add a new subscription plan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
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
                <Label>Billing Interval</Label>
                <Select
                  value={formData.billing_cycle}
                  onValueChange={(value: "monthly" | "yearly") => setFormData({ ...formData, billing_cycle: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active Plan</Label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Max Screens</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_screens}
                  onChange={(e) => setFormData({ ...formData, max_screens: e.target.value })}
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <Label>Max Playlists</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_playlists}
                  onChange={(e) => setFormData({ ...formData, max_playlists: e.target.value })}
                  placeholder="e.g., 10"
                />
              </div>
              <div>
                <Label>Storage</Label> {/* Removed hardcoded unit from label */}
                <div className="flex gap-2">
                  {" "}
                  {/* Added flex container for input + dropdown */}
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_media_storage}
                    onChange={(e) => setFormData({ ...formData, max_media_storage: e.target.value })}
                    placeholder="e.g., 10"
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
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
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

      {/* Delete Plan Dialog */}
      <Dialog
        open={!!deletingPlan}
        onOpenChange={() => {
          setDeletingPlan(null)
          setDeleteConfirmation("")
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Subscription Plan
            </DialogTitle>
            <DialogDescription className="text-base">
              This action cannot be undone. The plan will be permanently removed from the system.
            </DialogDescription>
          </DialogHeader>
          {deletingPlan && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-900">{deletingPlan.name}</p>
                <p className="text-sm text-red-700">
                  {formatCurrency(deletingPlan.price)} per {deletingPlan.billing_cycle}
                </p>
                <p className="text-sm text-red-700 mt-1">Current subscribers: {deletingPlan.subscriber_count || 0}</p>
              </div>

              {(deletingPlan.subscriber_count || 0) > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ This plan has active subscribers and cannot be deleted.
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">Please migrate all subscribers to another plan first.</p>
                </div>
              )}

              {(deletingPlan.subscriber_count || 0) === 0 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Type <strong>DELETE</strong> to confirm this action:
                  </p>
                  <Input
                    className="mt-2"
                    placeholder="Type DELETE to confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletingPlan(null)
                setDeleteConfirmation("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={(deletingPlan?.subscriber_count || 0) > 0 || deleteConfirmation !== "DELETE"}
              onClick={() => deletingPlan && handleDeletePlan(deletingPlan.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
