"use client"

import { useState, useEffect } from "react"
import { LocationsMap } from "@/components/locations/locations-map"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  Monitor,
  Building2,
  Map,
  List,
  X,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"

interface Location {
  id: string
  name: string
  description?: string
  parent_location_id?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  latitude?: number
  longitude?: number
  contact_person?: string
  phone_number?: string
  operating_hours?: string
  status: "active" | "inactive"
  tags?: string[]
  notes?: string
  screen_count: number
  screens?: any[]
  created_at: string
}

interface Screen {
  id: string
  name: string
  status: string
  screen_code: string
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [screens, setScreens] = useState<Screen[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAssignScreensDialogOpen, setIsAssignScreensDialogOpen] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_location_id: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    contact_person: "",
    phone_number: "",
    operating_hours: "",
    status: "active" as "active" | "inactive",
    tags: "",
    notes: "",
  })

  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("view") || "list"

  useEffect(() => {
    fetchLocations()
    fetchScreens()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations")

      if (response.status === 403) {
        const data = await response.json()
        toast({
          title: "Feature Unavailable",
          description: data.error || "Location management is not available on your current plan.",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to fetch locations")
      }

      const data = await response.json()
      setLocations(data.locations || [])
    } catch (error) {
      console.error("Error fetching locations:", error)
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchScreens = async () => {
    try {
      const response = await fetch("/api/screens")
      if (response.ok) {
        const data = await response.json()
        setScreens(data.screens || [])
      }
    } catch (error) {
      console.error("Error fetching screens:", error)
    }
  }

  const handleCreate = async () => {
    console.log("[v0] handleCreate called")
    console.log("[v0] formData:", formData)
    
    if (!formData.name.trim()) {
      console.log("[v0] Name validation failed")
      toast({
        title: "Error",
        description: "Location name is required",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    console.log("[v0] Starting location creation...")

    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
      }
      console.log("[v0] Request payload:", payload)

      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      console.log("[v0] Response status:", response.status)
      const responseData = await response.json()
      console.log("[v0] Response data:", responseData)

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create location")
      }

      toast({
        title: "Success",
        description: "Location created successfully",
      })

      setIsCreateDialogOpen(false)
      resetForm()
      fetchLocations()
    } catch (error) {
      console.error("[v0] Error creating location:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create location",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
      console.log("[v0] handleCreate finished")
    }
  }

  const handleUpdate = async () => {
    if (!currentLocation) return

    setSubmitting(true)

    try {
      const response = await fetch(`/api/locations/${currentLocation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update location")
      }

      toast({
        title: "Success",
        description: "Location updated successfully",
      })

      setIsEditDialogOpen(false)
      setCurrentLocation(null)
      resetForm()
      fetchLocations()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return

    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete location")
      }

      toast({
        title: "Success",
        description: "Location deleted successfully",
      })

      fetchLocations()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      })
    }
  }

  const handleAssignScreens = async () => {
    if (!currentLocation || selectedScreenIds.length === 0) return

    setSubmitting(true)

    try {
      const response = await fetch(`/api/locations/${currentLocation.id}/screens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screen_ids: selectedScreenIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to assign screens")
      }

      toast({
        title: "Success",
        description: `${selectedScreenIds.length} screen(s) assigned successfully`,
      })

      setIsAssignScreensDialogOpen(false)
      setSelectedScreenIds([])
      setCurrentLocation(null)
      fetchLocations()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign screens",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveScreen = async (locationId: string, screenId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}/screens`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screen_id: screenId }),
      })

      if (!response.ok) {
        throw new Error("Failed to remove screen")
      }

      toast({
        title: "Success",
        description: "Screen removed from location",
      })

      fetchLocations()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove screen",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (location: Location) => {
    setCurrentLocation(location)
    setFormData({
      name: location.name,
      description: location.description || "",
      parent_location_id: location.parent_location_id || "",
      address: location.address || "",
      city: location.city || "",
      state: location.state || "",
      zip_code: location.zip_code || "",
      country: location.country || "",
      contact_person: location.contact_person || "",
      phone_number: location.phone_number || "",
      operating_hours: location.operating_hours || "",
      status: location.status,
      tags: location.tags?.join(", ") || "",
      notes: location.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const openAssignScreensDialog = (location: Location) => {
    setCurrentLocation(location)
    setSelectedScreenIds([])
    setIsAssignScreensDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      parent_location_id: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
      contact_person: "",
      phone_number: "",
      operating_hours: "",
      status: "active",
      tags: "",
      notes: "",
    })
  }

  const setActiveView = (view: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", view)
    router.push(`?${params.toString()}`)
  }

  const filteredLocations = locations.filter(
    (location) =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getAvailableScreens = () => {
    if (!currentLocation) return screens

    const assignedScreenIds = currentLocation.screens?.map((s) => s.id) || []
    return screens.filter((screen) => !assignedScreenIds.includes(screen.id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage physical locations and assign screens</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveView} className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-2">
            <Map className="w-4 h-4" />
            Map View
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          {filteredLocations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first location to start organizing your screens
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Screens</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{location.name}</div>
                            {location.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {location.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {location.address && <div>{location.address}</div>}
                          {(location.city || location.state) && (
                            <div className="text-muted-foreground">
                              {[location.city, location.state].filter(Boolean).join(", ")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={location.status === "active" ? "default" : "secondary"}>
                          {location.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAssignScreensDialog(location)}
                          className="gap-2"
                        >
                          <Monitor className="w-4 h-4" />
                          {location.screen_count}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(location)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(location.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Map View */}
        <TabsContent value="map">
          <LocationsMap 
            locations={locations} 
            onLocationClick={(location) => {
              setCurrentLocation(location)
              setIsEditDialogOpen(true)
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Location Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          setCurrentLocation(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentLocation ? "Edit Location" : "Create Location"}</DialogTitle>
            <DialogDescription>
              {currentLocation ? "Update location details" : "Add a new physical location for your screens"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Office, Store #42"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this location"
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                />
              </div>

              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NY"
                />
              </div>

              <div>
                <Label htmlFor="zip_code">Zip/Postal Code</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="10001"
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="United States"
                />
              </div>

              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="retail, flagship, downtown"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information about this location"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setIsEditDialogOpen(false)
                setCurrentLocation(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={currentLocation ? handleUpdate : handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {currentLocation ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Screens Dialog */}
      <Dialog open={isAssignScreensDialogOpen} onOpenChange={setIsAssignScreensDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Screens - {currentLocation?.name}</DialogTitle>
            <DialogDescription>
              Assign or remove screens from this location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Currently Assigned Screens */}
            {currentLocation && currentLocation.screens && currentLocation.screens.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Assigned Screens ({currentLocation.screens.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {currentLocation.screens.map((screen: any) => (
                    <div
                      key={screen.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium">{screen.name}</div>
                          <div className="text-sm text-muted-foreground">{screen.screen_code}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveScreen(currentLocation.id, screen.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Screens */}
            <div>
              <h4 className="font-semibold mb-3">Available Screens</h4>
              {getAvailableScreens().length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                  No available screens to assign
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {getAvailableScreens().map((screen) => (
                    <Card
                      key={screen.id}
                      className={`cursor-pointer transition-colors ${
                        selectedScreenIds.includes(screen.id)
                          ? "ring-2 ring-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        setSelectedScreenIds((prev) =>
                          prev.includes(screen.id)
                            ? prev.filter((id) => id !== screen.id)
                            : [...prev, screen.id]
                        )
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Monitor className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{screen.name}</div>
                            <div className="text-sm text-muted-foreground">{screen.screen_code}</div>
                          </div>
                          <Badge variant={screen.status === "online" ? "default" : "secondary"}>
                            {screen.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignScreensDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleAssignScreens}
              disabled={selectedScreenIds.length === 0 || submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign {selectedScreenIds.length} Screen{selectedScreenIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
