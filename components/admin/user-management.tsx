"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Switch } from "@/components/ui/switch"
import {
  Users,
  Search,
  MoreHorizontal,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  Crown,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface User {
  id: string
  email: string
  role: "user" | "admin" | "superadmin"
  created_at: string
  full_name?: string
  company_name?: string
  subscription_status?: "active" | "inactive" | "expired"
  subscription_plan?: string
  subscription_plan_id?: string
  deleted_at?: string | null
}

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  billing_cycle: string
  is_active: boolean
  max_playlists?: number
}

interface UserManagementProps {
  userRole: string
}

export function UserManagement({ userRole }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [permanentDeleteUser, setPermanentDeleteUser] = useState<User | null>(null)
  const [permanentDeleteConfirmEmail, setPermanentDeleteConfirmEmail] = useState("")
  const [permanentDeleteDataCounts, setPermanentDeleteDataCounts] = useState<{
    screens: number
    media: number
    playlists: number
    storage_bytes: number
  } | null>(null)
  const [loadingDataCounts, setLoadingDataCounts] = useState(false)
  const [permanentDeleting, setPermanentDeleting] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newUser, setNewUser] = useState({ email: "", role: "user" })
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
    fetchSubscriptionPlans()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [showDeleted])

  const fetchUsers = async () => {
    try {
      const url = showDeleted ? "/api/admin/users?includeDeleted=true" : "/api/admin/users"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans")
      if (response.ok) {
        const data = await response.json()
        setSubscriptionPlans(data.plans || [])
      }
    } catch (error) {
      console.error("Error fetching subscription plans:", error)
    }
  }

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      console.log("[v0] Updating user with data:", updates)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        console.log("[v0] User update successful")
        toast({
          title: "Success",
          description: "User updated successfully",
        })
        return true
      } else {
        const error = await response.json()
        console.log("[v0] User update failed:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to update user",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error("[v0] Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
      return false
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      console.log("[v0] Deleting user:", userId)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      console.log("[v0] Delete response:", response.status, data)

      if (response.ok && data.success) {
        await fetchUsers()
        setDeletingUser(null)
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSubscription = async (userId: string, planId: string, status = "active") => {
    try {
      console.log("[v0] Updating subscription with planId:", planId, "status:", status)
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, status }),
      })

      if (response.ok) {
        console.log("[v0] Subscription update successful")
        toast({
          title: "Success",
          description: "User subscription updated successfully",
        })
        return true
      } else {
        const error = await response.json()
        console.log("[v0] Subscription update failed:", error)
        toast({
          title: "Error",
          description: error.error || "Failed to update subscription",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error("Error updating subscription:", error)
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive",
      })
      return false
    }
  }

  const handleCreateUser = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })

      if (response.ok) {
        await fetchUsers()
        setShowCreateDialog(false)
        setNewUser({ email: "", role: "user" })
        toast({
          title: "Success",
          description: "User created successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to create user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating user:", error)
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    }
  }

  const handleRestoreUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/restore`, {
        method: "POST",
      })

      if (response.ok) {
        await fetchUsers()
        toast({
          title: "Success",
          description: "User restored successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to restore user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error restoring user:", error)
      toast({
        title: "Error",
        description: "Failed to restore user",
        variant: "destructive",
      })
    }
  }

  const fetchUserDataCounts = async (userId: string) => {
    setLoadingDataCounts(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/data-counts`)
      if (response.ok) {
        const data = await response.json()
        setPermanentDeleteDataCounts(data)
      } else {
        setPermanentDeleteDataCounts({ screens: 0, media: 0, playlists: 0, storage_bytes: 0 })
      }
    } catch (error) {
      console.error("Error fetching data counts:", error)
      setPermanentDeleteDataCounts({ screens: 0, media: 0, playlists: 0, storage_bytes: 0 })
    } finally {
      setLoadingDataCounts(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!permanentDeleteUser || permanentDeleteConfirmEmail !== permanentDeleteUser.email) return

    setPermanentDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${permanentDeleteUser.id}/permanent`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchUsers()
        setPermanentDeleteUser(null)
        setPermanentDeleteConfirmEmail("")
        setPermanentDeleteDataCounts(null)
        toast({
          title: "Success",
          description: "User permanently deleted",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to permanently delete user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error permanently deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to permanently delete user",
        variant: "destructive",
      })
    } finally {
      setPermanentDeleting(false)
    }
  }

  const openPermanentDeleteDialog = (user: User) => {
    setPermanentDeleteUser(user)
    setPermanentDeleteConfirmEmail("")
    fetchUserDataCounts(user.id)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesDeleted = showDeleted || !user.deleted_at
    return matchesSearch && matchesRole && matchesDeleted
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Crown className="w-3 h-3 mr-1" />
            Super Admin
          </Badge>
        )
      case "admin":
        return (
          <Badge variant="secondary">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      default:
        return <Badge variant="outline">User</Badge>
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800">
            <UserCheck className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
      case "expired":
        return (
          <Badge className="bg-red-100 text-red-800">
            <UserX className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        )
      default:
        return <Badge variant="outline">Inactive</Badge>
    }
  }

  const canEditUser = (user: User) => {
    if (userRole === "superadmin") return true
    if (userRole === "admin" && user.role === "user") return true
    return false
  }

  const canDeleteUser = (user: User) => {
    if (userRole === "superadmin" && user.role !== "superadmin") return true
    if (userRole === "admin" && user.role === "user") return true
    return false
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>Search and filter user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search users by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="superadmin">Super Admins</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 border rounded-md px-3 py-2">
              <Switch id="show-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} />
              <Label htmlFor="show-deleted" className="cursor-pointer text-sm">
                Show Deleted
              </Label>
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className={user.deleted_at ? "opacity-60 bg-muted/30" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{user.email}</p>
                          {user.full_name && <p className="text-sm text-muted-foreground">{user.full_name}</p>}
                        </div>
                        {user.deleted_at && (
                          <Badge variant="destructive" className="ml-2">
                            Deleted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(user.subscription_status)}
                        {user.subscription_plan && (
                          <p className="text-xs text-muted-foreground">{user.subscription_plan}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.company_name || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {user.deleted_at ? (
                            <>
                              <DropdownMenuItem onClick={() => handleRestoreUser(user.id)} className="text-green-600">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restore User
                              </DropdownMenuItem>
                              {userRole === "superadmin" && (
                                <DropdownMenuItem
                                  onClick={() => openPermanentDeleteDialog(user)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              )}
                            </>
                          ) : (
                            <>
                              {canEditUser(user) && (
                                <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                              )}
                              {canDeleteUser(user) && (
                                <DropdownMenuItem onClick={() => setDeletingUser(user)} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user role, permissions, and subscription</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={editingUser.email} disabled />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {userRole === "superadmin" && <SelectItem value="superadmin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subscription Plan</Label>
                <Select
                  value={editingUser.subscription_plan_id || "none"}
                  onValueChange={(value) => setEditingUser({ ...editingUser, subscription_plan_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Plan</SelectItem>
                    {subscriptionPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price}/{plan.billing_cycle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subscription Status</Label>
                <Select
                  value={editingUser.subscription_status || "inactive"}
                  onValueChange={(value) => setEditingUser({ ...editingUser, subscription_status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingUser) return

                try {
                  const roleUpdateSuccess = await handleUpdateUser(editingUser.id, {
                    role: editingUser.role,
                  })

                  if (roleUpdateSuccess) {
                    if (editingUser.subscription_plan_id && editingUser.subscription_plan_id !== "none") {
                      await handleUpdateSubscription(
                        editingUser.id,
                        editingUser.subscription_plan_id,
                        editingUser.subscription_status || "active",
                      )
                    }

                    setUsers((prevUsers) =>
                      prevUsers.map((user) =>
                        user.id === editingUser.id
                          ? {
                              ...user,
                              role: editingUser.role,
                              subscription_status: editingUser.subscription_status,
                              subscription_plan_id: editingUser.subscription_plan_id,
                              subscription_plan:
                                editingUser.subscription_plan_id !== "none"
                                  ? subscriptionPlans.find((p) => p.id === editingUser.subscription_plan_id)?.name
                                  : undefined,
                            }
                          : user,
                      ),
                    )

                    setEditingUser(null)
                  }
                } catch (error) {
                  console.error("[v0] Error saving changes:", error)
                  toast({
                    title: "Error",
                    description: "Failed to save changes",
                    variant: "destructive",
                  })
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{deletingUser.email}</p>
              <p className="text-sm text-muted-foreground">Role: {deletingUser.role}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deletingUser && handleDeleteUser(deletingUser.id)}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {userRole === "superadmin" && <SelectItem value="superadmin">Super Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={!newUser.email}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog
        open={!!permanentDeleteUser}
        onOpenChange={(open) => {
          if (!open) {
            setPermanentDeleteUser(null)
            setPermanentDeleteConfirmEmail("")
            setPermanentDeleteDataCounts(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Permanently Delete User
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </DialogDescription>
          </DialogHeader>

          {permanentDeleteUser && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You are about to permanently delete <strong>{permanentDeleteUser.email}</strong>
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">The following will be deleted:</p>
                {loadingDataCounts ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : permanentDeleteDataCounts ? (
                  <ul className="text-sm space-y-1">
                    <li>• {permanentDeleteDataCounts.screens} screens</li>
                    <li>
                      • {permanentDeleteDataCounts.media} media files (
                      {formatBytes(permanentDeleteDataCounts.storage_bytes)})
                    </li>
                    <li>• {permanentDeleteDataCounts.playlists} playlists</li>
                    <li>• All subscriptions and billing history</li>
                    <li>• User profile and settings</li>
                  </ul>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-email">
                  Type <strong>{permanentDeleteUser.email}</strong> to confirm:
                </Label>
                <Input
                  id="confirm-email"
                  value={permanentDeleteConfirmEmail}
                  onChange={(e) => setPermanentDeleteConfirmEmail(e.target.value)}
                  placeholder="Enter email to confirm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPermanentDeleteUser(null)
                setPermanentDeleteConfirmEmail("")
                setPermanentDeleteDataCounts(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={
                !permanentDeleteUser || permanentDeleteConfirmEmail !== permanentDeleteUser.email || permanentDeleting
              }
            >
              {permanentDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
