"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Plus, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FeaturePermission {
  id: string
  plan_id: string
  plan_name: string
  feature_key: string
  feature_name: string
  is_enabled: boolean
  limit_value?: number
  created_at: string
}

interface Feature {
  feature_key: string
  feature_name: string
  description?: string
  permissions: FeaturePermission[]
}

interface Plan {
  id: string
  name: string
  price: number
  billing_cycle: string
  is_active: boolean
}

export function FeatureManagement() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingFeature, setDeletingFeature] = useState<Feature | null>(null)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [editEnabledPlanIds, setEditEnabledPlanIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newFeatureKey, setNewFeatureKey] = useState("")
  const [enabledPlanIds, setEnabledPlanIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    fetchFeatures()
    fetchPlans()
  }, [])

  const fetchFeatures = async () => {
    try {
      const response = await fetch("/api/admin/features")
      if (response.ok) {
        const data = await response.json()
        setFeatures(data.features)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch features",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching features:", error)
      toast({
        title: "Error",
        description: "Failed to fetch features",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans")
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans.filter((p: Plan) => p.is_active))
      }
    } catch (error) {
      console.error("[v0] Error fetching plans:", error)
    }
  }

  const handleCreateFeature = async () => {
    if (!newFeatureKey.trim()) {
      toast({ title: "Error", description: "Feature key is required", variant: "destructive" })
      return
    }
    try {
      const response = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_key: newFeatureKey.trim().toLowerCase().replace(/\s+/g, "_"),
          plan_enabled_ids: Array.from(enabledPlanIds),
        }),
      })
      if (response.ok) {
        await fetchFeatures()
        setShowCreateDialog(false)
        setNewFeatureKey("")
        setEnabledPlanIds(new Set())
        toast({ title: "Success", description: "Feature created successfully" })
      } else {
        const error = await response.json()
        toast({ title: "Error", description: error.message || "Failed to create feature", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create feature", variant: "destructive" })
    }
  }

  const handleDeleteFeature = async (featureKey: string) => {
    try {
      const response = await fetch(`/api/admin/features/${featureKey}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchFeatures()
        setDeletingFeature(null)
        toast({
          title: "Success",
          description: "Feature deleted successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to delete feature",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting feature:", error)
      toast({
        title: "Error",
        description: "Failed to delete feature",
        variant: "destructive",
      })
    }
  }

  const handleToggleFeature = async (permissionId: string, isEnabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/features/permissions/${permissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: isEnabled }),
      })

      if (response.ok) {
        await fetchFeatures()
        toast({
          title: "Success",
          description: `Feature ${isEnabled ? "enabled" : "disabled"} successfully`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update feature",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error toggling feature:", error)
      toast({
        title: "Error",
        description: "Failed to update feature",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (feature: Feature) => {
    setEditingFeature(feature)
    setEditEnabledPlanIds(new Set(feature.permissions.filter((p) => p.is_enabled).map((p) => p.plan_id)))
  }

  const handleSaveEdit = async () => {
    if (!editingFeature) return
    setSaving(true)
    try {
      // Update each permission in parallel based on the toggle state
      await Promise.all(
        editingFeature.permissions.map((p) =>
          fetch(`/api/admin/features/permissions/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_enabled: editEnabledPlanIds.has(p.plan_id) }),
          })
        )
      )
      await fetchFeatures()
      setEditingFeature(null)
      toast({ title: "Success", description: "Feature updated successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to update feature", variant: "destructive" })
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-3xl font-bold text-foreground">Feature Management</h1>
          <p className="text-muted-foreground mt-1">Define and manage feature access based on subscription tiers</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-500 hover:bg-emerald-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Feature
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Matrix</CardTitle>
          <CardDescription>Configure which features are available for each subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-80">Feature</TableHead>
                  {plans.map((plan) => (
                    <TableHead key={plan.id} className="text-center min-w-32">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(plan.price)}/monthly</p>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((feature) => (
                  <TableRow key={feature.feature_key}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{feature.feature_name}</p>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </TableCell>
                    {plans.map((plan) => {
                      const permission = feature.permissions.find((p) => p.plan_id === plan.id)
                      return (
                        <TableCell key={plan.id} className="text-center">
                          {permission ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFeature(permission.id, !permission.is_enabled)}
                              className="p-1"
                            >
                              {permission.is_enabled ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Feature Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false)
            setNewFeatureKey("")
            setEnabledPlanIds(new Set())
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Feature</DialogTitle>
            <DialogDescription>Add a new feature and choose which plans it is enabled for.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feature Key</Label>
              <Input
                value={newFeatureKey}
                onChange={(e) => setNewFeatureKey(e.target.value)}
                placeholder="e.g., custom_branding"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Unique identifier — spaces will become underscores, will be lowercased.
              </p>
            </div>
            <div>
              <Label className="mb-2 block">Enable for plans</Label>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                    <span className="text-sm font-medium">{plan.name}</span>
                    <Switch
                      checked={enabledPlanIds.has(plan.id)}
                      onCheckedChange={(checked) => {
                        setEnabledPlanIds((prev) => {
                          const next = new Set(prev)
                          checked ? next.add(plan.id) : next.delete(plan.id)
                          return next
                        })
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setNewFeatureKey("")
                setEnabledPlanIds(new Set())
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFeature}>Create Feature</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Feature Dialog */}
      <Dialog open={!!deletingFeature} onOpenChange={() => setDeletingFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feature</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feature? This will remove it from all subscription plans.
            </DialogDescription>
          </DialogHeader>
          {deletingFeature && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{deletingFeature.feature_name}</p>
              <p className="text-sm text-muted-foreground">{deletingFeature.feature_key}</p>
              <p className="text-sm text-muted-foreground">
                {deletingFeature.permissions.length} plan permissions will be removed
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingFeature(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingFeature && handleDeleteFeature(deletingFeature.feature_key)}
            >
              Delete Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
