"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Calendar,
  Plus,
  Search,
  Trash2,
  Edit,
  Clock,
  PlayCircle,
  ImageIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Schedule {
  id: string
  name: string
  description: string
  is_active: boolean
  timezone: string
  created_at: string
  schedule_items: { count: number }[]
}

interface ScheduleItem {
  id: string
  content_type: "playlist" | "media"
  content_id: string
  start_time: string
  end_time: string
  recurrence_rule: string | null
  days_of_week: number[] | null
  priority: number
  is_active: boolean
  playlists?: { id: string; name: string }
  media?: { id: string; name: string; type: string; url: string }
}

interface Playlist {
  id: string
  name: string
}

interface Media {
  id: string
  name: string
  type: string
  url: string
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Form states
  const [newScheduleName, setNewScheduleName] = useState("")
  const [newScheduleDescription, setNewScheduleDescription] = useState("")
  const [newScheduleTimezone, setNewScheduleTimezone] = useState("UTC")
  const [editScheduleName, setEditScheduleName] = useState("")
  const [editScheduleDescription, setEditScheduleDescription] = useState("")
  const [editScheduleActive, setEditScheduleActive] = useState(true)

  // Schedule item form states
  const [itemContentType, setItemContentType] = useState<"playlist" | "media">("playlist")
  const [itemContentId, setItemContentId] = useState("")
  const [itemStartTime, setItemStartTime] = useState("")
  const [itemEndTime, setItemEndTime] = useState("")
  const [itemRecurrence, setItemRecurrence] = useState<"none" | "daily" | "weekly">("none")
  const [itemDaysOfWeek, setItemDaysOfWeek] = useState<number[]>([])
  const [itemPriority, setItemPriority] = useState(0)

  // Content for schedule items
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [mediaItems, setMediaItems] = useState<Media[]>([])

  useEffect(() => {
    fetchSchedules()
    fetchPlaylists()
    fetchMedia()
  }, [])

  const fetchSchedules = async () => {
    try {
      const response = await fetch("/api/schedules")
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error("Error fetching schedules:", error)
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/playlists")
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.playlists || [])
      }
    } catch (error) {
      console.error("Error fetching playlists:", error)
    }
  }

  const fetchMedia = async () => {
    try {
      const response = await fetch("/api/media")
      if (response.ok) {
        const data = await response.json()
        setMediaItems(data.media || [])
      }
    } catch (error) {
      console.error("Error fetching media:", error)
    }
  }

  const fetchScheduleItems = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}`)
      if (response.ok) {
        const data = await response.json()
        setScheduleItems(data.schedule.schedule_items || [])
      }
    } catch (error) {
      console.error("Error fetching schedule items:", error)
    }
  }

  const handleCreateSchedule = async () => {
    console.log("[v0] handleCreateSchedule called")
    console.log("[v0] newScheduleName:", newScheduleName)
    console.log("[v0] newScheduleDescription:", newScheduleDescription)
    console.log("[v0] newScheduleTimezone:", newScheduleTimezone)
    
    if (!newScheduleName.trim()) {
      console.log("[v0] Validation failed: schedule name is empty")
      toast({
        title: "Error",
        description: "Schedule name is required",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Starting schedule creation...")
    
    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newScheduleName,
          description: newScheduleDescription,
          timezone: newScheduleTimezone,
        }),
      })

      console.log("[v0] API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Schedule created successfully:", data)
        toast({
          title: "Success",
          description: "Schedule created successfully",
        })
        setIsCreateDialogOpen(false)
        setNewScheduleName("")
        setNewScheduleDescription("")
        fetchSchedules()
      } else {
        const data = await response.json()
        console.log("[v0] Error response:", data)
        toast({
          title: "Error",
          description: data.error || "Failed to create schedule",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating schedule:", error)
      toast({
        title: "Error",
        description: "Failed to create schedule",
        variant: "destructive",
      })
    }
  }

  const handleEditSchedule = async () => {
    if (!selectedSchedule) return

    try {
      const response = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editScheduleName,
          description: editScheduleDescription,
          is_active: editScheduleActive,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Schedule updated successfully",
        })
        setIsEditDialogOpen(false)
        fetchSchedules()
      } else {
        toast({
          title: "Error",
          description: "Failed to update schedule",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating schedule:", error)
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return

    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Schedule deleted successfully",
        })
        fetchSchedules()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete schedule",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting schedule:", error)
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      })
    }
  }

  const handleAddScheduleItem = async () => {
    if (!selectedSchedule) return
    
    if (!itemContentId || !itemStartTime || !itemEndTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    let recurrenceRule = null
    let daysOfWeek = null

    if (itemRecurrence === "daily") {
      recurrenceRule = "FREQ=DAILY"
    } else if (itemRecurrence === "weekly" && itemDaysOfWeek.length > 0) {
      const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
      const byDay = itemDaysOfWeek.map((d) => days[d]).join(",")
      recurrenceRule = `FREQ=WEEKLY;BYDAY=${byDay}`
      daysOfWeek = itemDaysOfWeek
    }

    try {
      const response = await fetch(`/api/schedules/${selectedSchedule.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: itemContentType,
          content_id: itemContentId,
          start_time: itemStartTime,
          end_time: itemEndTime,
          recurrence_rule: recurrenceRule,
          days_of_week: daysOfWeek,
          priority: itemPriority,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Schedule item added successfully",
        })
        setIsAddItemDialogOpen(false)
        resetItemForm()
        fetchScheduleItems(selectedSchedule.id)
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to add schedule item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding schedule item:", error)
      toast({
        title: "Error",
        description: "Failed to add schedule item",
        variant: "destructive",
      })
    }
  }

  const handleDeleteScheduleItem = async (itemId: string) => {
    if (!selectedSchedule || !confirm("Are you sure you want to delete this schedule item?")) return

    try {
      const response = await fetch(`/api/schedules/${selectedSchedule.id}/items/${itemId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Schedule item deleted successfully",
        })
        fetchScheduleItems(selectedSchedule.id)
      } else {
        toast({
          title: "Error",
          description: "Failed to delete schedule item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting schedule item:", error)
      toast({
        title: "Error",
        description: "Failed to delete schedule item",
        variant: "destructive",
      })
    }
  }

  const resetItemForm = () => {
    setItemContentType("playlist")
    setItemContentId("")
    setItemStartTime("")
    setItemEndTime("")
    setItemRecurrence("none")
    setItemDaysOfWeek([])
    setItemPriority(0)
  }

  const openEditDialog = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setEditScheduleName(schedule.name)
    setEditScheduleDescription(schedule.description || "")
    setEditScheduleActive(schedule.is_active)
    setIsEditDialogOpen(true)
  }

  const openScheduleDetails = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    fetchScheduleItems(schedule.id)
  }

  const toggleDayOfWeek = (day: number) => {
    setItemDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const filteredSchedules = schedules.filter((schedule) =>
    schedule.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading schedules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Schedules</h1>
          <p className="text-muted-foreground">Manage time-based content scheduling</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search schedules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Schedules Grid */}
      {selectedSchedule ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Button variant="ghost" onClick={() => setSelectedSchedule(null)}>
                ← Back to Schedules
              </Button>
              <h2 className="text-2xl font-bold mt-2">{selectedSchedule.name}</h2>
              <p className="text-muted-foreground">{selectedSchedule.description}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openEditDialog(selectedSchedule)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button onClick={() => setIsAddItemDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Time Slot
              </Button>
            </div>
          </div>

          {/* Schedule Items */}
          <div className="space-y-4">
            {scheduleItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No time slots added yet</p>
                  <Button className="mt-4" onClick={() => setIsAddItemDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Time Slot
                  </Button>
                </CardContent>
              </Card>
            ) : (
              scheduleItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {item.content_type === "playlist" ? (
                          <PlayCircle className="w-5 h-5 text-primary" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-primary" />
                        )}
                        <div>
                          <p className="font-medium">
                            {item.content_type === "playlist"
                              ? item.playlists?.name
                              : item.media?.name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>
                              {new Date(`2000-01-01T${item.start_time}`).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              -{" "}
                              {new Date(`2000-01-01T${item.end_time}`).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {item.recurrence_rule && (
                              <span className="text-xs px-2 py-1 bg-secondary rounded">
                                {item.recurrence_rule.includes("DAILY")
                                  ? "Daily"
                                  : item.recurrence_rule.includes("WEEKLY")
                                    ? `Weekly: ${item.days_of_week?.map((d) => dayNames[d]).join(", ")}`
                                    : "Recurring"}
                              </span>
                            )}
                            <span className="text-xs px-2 py-1 bg-secondary rounded">
                              Priority: {item.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteScheduleItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchedules.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No schedules found" : "No schedules yet"}
                </p>
                {!searchQuery && (
                  <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Schedule
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredSchedules.map((schedule) => (
              <Card
                key={schedule.id}
                className="hover:border-primary transition-colors cursor-pointer"
                onClick={() => openScheduleDetails(schedule)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Calendar className="w-8 h-8 text-primary" />
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDialog(schedule)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSchedule(schedule.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="mt-4">{schedule.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{schedule.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {schedule.schedule_items?.[0]?.count || 0} time slots
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        schedule.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {schedule.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Create Schedule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Schedule</DialogTitle>
            <DialogDescription>
              Create a new schedule to manage time-based content delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Schedule Name</Label>
              <Input
                id="name"
                placeholder="Morning Content"
                value={newScheduleName}
                onChange={(e) => setNewScheduleName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Content scheduled for morning hours"
                value={newScheduleDescription}
                onChange={(e) => setNewScheduleDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={newScheduleTimezone} onValueChange={setNewScheduleTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSchedule}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Schedule Name</Label>
              <Input
                id="edit-name"
                value={editScheduleName}
                onChange={(e) => setEditScheduleName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editScheduleDescription}
                onChange={(e) => setEditScheduleDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Active</Label>
              <Switch
                id="edit-active"
                checked={editScheduleActive}
                onCheckedChange={setEditScheduleActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSchedule}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Time Slot</DialogTitle>
            <DialogDescription>
              Add a time-based content slot to this schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Content Type</Label>
              <Select value={itemContentType} onValueChange={(v: "playlist" | "media") => setItemContentType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="playlist">Playlist</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select {itemContentType === "playlist" ? "Playlist" : "Media"}</Label>
              <Select value={itemContentId} onValueChange={setItemContentId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose a ${itemContentType}`} />
                </SelectTrigger>
                <SelectContent>
                  {itemContentType === "playlist"
                    ? playlists.map((pl) => (
                        <SelectItem key={pl.id} value={pl.id}>
                          {pl.name}
                        </SelectItem>
                      ))
                    : mediaItems.map((media) => (
                        <SelectItem key={media.id} value={media.id}>
                          {media.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={itemStartTime}
                  onChange={(e) => setItemStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={itemEndTime}
                  onChange={(e) => setItemEndTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Recurrence</Label>
              <Select value={itemRecurrence} onValueChange={(v: "none" | "daily" | "weekly") => setItemRecurrence(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {itemRecurrence === "weekly" && (
              <div>
                <Label>Days of Week</Label>
                <div className="flex gap-2 mt-2">
                  {dayNames.map((day, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={itemDaysOfWeek.includes(index) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDayOfWeek(index)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="priority">Priority (0-10)</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="10"
                value={itemPriority}
                onChange={(e) => setItemPriority(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddScheduleItem}>Add Time Slot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
