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
import { Textarea } from "@/components/ui/textarea"
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

interface FeatureFormData {
  feature_key: string
  feature_name: string
  description: string
}

export function FeatureManagement() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [deletingFeature, setDeletingFeature] = useState<Feature | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState<FeatureFormData>({
    feature_key: "",
    feature_name: "",
    description: "",
  })
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
    try {
      const response = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchFeatures()
        setShowCreateDialog(false)
        resetForm()
        toast({
          title: "Success",
          description: "Feature created successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to create feature",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating feature:", error)
      toast({
        title: "Error",
        description: "Failed to create feature",
        variant: "destructive",
      })
    }
  }

  const handleUpdateFeature = async () => {
    if (!editingFeature) return

    try {
      const response = await fetch(`/api/admin/features/${editingFeature.feature_key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchFeatures()
        setEditingFeature(null)
        resetForm()
        toast({
          title: "Success",
          description: "Feature updated successfully",
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
      console.error("[v0] Error updating feature:", error)
      toast({
        title: "Error",
        description: "Failed to update feature",
        variant: "destructive",
      })
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

  const resetForm = () => {
    setFormData({
      feature_key: "",
      feature_name: "",
      description: "",
    })
  }

  const openEditDialog = (feature: Feature) => {
    setFormData({
      feature_key: feature.feature_key,
      feature_name: feature.feature_name,
      description: feature.description || "",
    })
    setEditingFeature(feature)
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

      {/* Create/Edit Feature Dialog */}
      <Dialog
        open={showCreateDialog || !!editingFeature}
        onOpenChange={() => {
          setShowCreateDialog(false)
          setEditingFeature(null)
          resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFeature ? "Edit Feature" : "Create New Feature"}</DialogTitle>
            <DialogDescription>
              {editingFeature ? "Update feature details" : "Add a new feature to the system"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feature Key</Label>
              <Input
                value={formData.feature_key}
                onChange={(e) => setFormData({ ...formData, feature_key: e.target.value })}
                placeholder="e.g., custom_branding"
                disabled={!!editingFeature}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Unique identifier for the feature (cannot be changed after creation)
              </p>
            </div>
            <div>
              <Label>Feature Name</Label>
              <Input
                value={formData.feature_name}
                onChange={(e) => setFormData({ ...formData, feature_name: e.target.value })}
                placeholder="e.g., Custom Branding"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of the feature..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setEditingFeature(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingFeature ? handleUpdateFeature : handleCreateFeature}>
              {editingFeature ? "Update Feature" : "Create Feature"}
            </Button>
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
