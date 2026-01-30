"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Calendar,
  Plus,
  Search,
  Trash2,
  Edit,
  Clock,
  PlayCircle,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Schedule {
  id: string
  name: string
  description: string
  is_active: boolean
  created_at: string
  schedule_items: ScheduleItem[]
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

// Predefined colors for time slots
const SLOT_COLORS = [
  { bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-800" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800" },
  { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800" },
  { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800" },
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
]

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek
    return new Date(today.setDate(diff))
  })
  const { toast } = useToast()

  // Form states
  const [newScheduleName, setNewScheduleName] = useState("")
  const [newScheduleDescription, setNewScheduleDescription] = useState("")
  const [editScheduleName, setEditScheduleName] = useState("")
  const [editScheduleDescription, setEditScheduleDescription] = useState("")
  const [editScheduleActive, setEditScheduleActive] = useState(true)

  // Schedule item form states
  const [itemContentType, setItemContentType] = useState<"playlist" | "media">("playlist")
  const [itemContentId, setItemContentId] = useState("")
  const [itemStartTime, setItemStartTime] = useState("09:00")
  const [itemEndTime, setItemEndTime] = useState("17:00")
  const [itemRecurrence, setItemRecurrence] = useState<"none" | "daily" | "weekly">("daily")
  const [itemDaysOfWeek, setItemDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5])
  const [itemPriority, setItemPriority] = useState(0)
  const [clickedDayIndex, setClickedDayIndex] = useState<number | null>(null)

  // Content for schedule items
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [mediaItems, setMediaItems] = useState<Media[]>([])

  // Hours for calendar grid (6 AM to 10 PM)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6)

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + i)
      return date
    })
  }, [currentWeekStart])

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  useEffect(() => {
    fetchSchedules()
    fetchPlaylists()
    fetchMedia()
  }, [])

  useEffect(() => {
    if (selectedSchedule) {
      fetchScheduleItems(selectedSchedule.id)
    }
  }, [selectedSchedule])

  const fetchSchedules = async () => {
    try {
      const response = await fetch("/api/schedules")
      if (response.ok) {
        const data = await response.json()
        const schedulesData = data.schedules || []
        setSchedules(schedulesData)
        // Auto-select first schedule if none selected
        if (schedulesData.length > 0 && !selectedSchedule) {
          setSelectedSchedule(schedulesData[0])
        }
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
      const response = await fetch("/api/media/list")
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
        setScheduleItems(data.schedule?.schedule_items || [])
      }
    } catch (error) {
      console.error("Error fetching schedule items:", error)
    }
  }

  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) {
      toast({
        title: "Error",
        description: "Schedule name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newScheduleName,
          description: newScheduleDescription,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: "Schedule created successfully",
        })
        setIsCreateDialogOpen(false)
        setNewScheduleName("")
        setNewScheduleDescription("")
        fetchSchedules()
        // Select the newly created schedule
        if (data.schedule) {
          setSelectedSchedule(data.schedule)
        }
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to create schedule",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating schedule:", error)
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
        if (selectedSchedule?.id === scheduleId) {
          setSelectedSchedule(null)
          setScheduleItems([])
        }
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
    if (!selectedSchedule) {
      toast({
        title: "Error",
        description: "Please select a schedule first",
        variant: "destructive",
      })
      return
    }

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
          description: "Time slot added successfully",
        })
        setIsAddItemDialogOpen(false)
        resetItemForm()
        fetchScheduleItems(selectedSchedule.id)
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to add time slot",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding schedule item:", error)
      toast({
        title: "Error",
        description: "Failed to add time slot",
        variant: "destructive",
      })
    }
  }

  const handleDeleteScheduleItem = async (itemId: string) => {
    if (!selectedSchedule) return

    try {
      const response = await fetch(`/api/schedules/${selectedSchedule.id}/items/${itemId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Time slot deleted",
        })
        fetchScheduleItems(selectedSchedule.id)
      } else {
        toast({
          title: "Error",
          description: "Failed to delete time slot",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting schedule item:", error)
      toast({
        title: "Error",
        description: "Failed to delete time slot",
        variant: "destructive",
      })
    }
  }

  const resetItemForm = () => {
    setItemContentType("playlist")
    setItemContentId("")
    setItemStartTime("09:00")
    setItemEndTime("17:00")
    setItemRecurrence("daily")
    setItemDaysOfWeek([1, 2, 3, 4, 5])
    setItemPriority(0)
    setClickedDayIndex(null)
  }

  const openEditDialog = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setEditScheduleName(schedule.name)
    setEditScheduleDescription(schedule.description || "")
    setEditScheduleActive(schedule.is_active)
    setIsEditDialogOpen(true)
  }

  const toggleDayOfWeek = (day: number) => {
    setItemDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const goToToday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek
    setCurrentWeekStart(new Date(today.setDate(diff)))
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeekStart(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeekStart(newDate)
  }

  const handleCellClick = (dayIndex: number, hour: number) => {
    if (!selectedSchedule) {
      toast({
        title: "No schedule selected",
        description: "Please select or create a schedule first",
        variant: "destructive",
      })
      return
    }
    setClickedDayIndex(dayIndex)
    setItemStartTime(`${hour.toString().padStart(2, "0")}:00`)
    setItemEndTime(`${(hour + 1).toString().padStart(2, "0")}:00`)
    // If clicking on a specific day, set weekly recurrence with that day
    setItemRecurrence("weekly")
    setItemDaysOfWeek([dayIndex])
    setIsAddItemDialogOpen(true)
  }

  const filteredSchedules = schedules.filter((schedule) =>
    schedule.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get time slot position and height for calendar display
  const getSlotStyle = (item: ScheduleItem) => {
    const [startHour, startMin] = item.start_time.split(":").map(Number)
    const [endHour, endMin] = item.end_time.split(":").map(Number)

    const startOffset = (startHour - 6) * 60 + startMin
    const endOffset = (endHour - 6) * 60 + endMin
    const duration = endOffset - startOffset

    return {
      top: `${(startOffset / 60) * 48}px`,
      height: `${(duration / 60) * 48}px`,
    }
  }

  // Check if an item should display on a given day
  const shouldDisplayOnDay = (item: ScheduleItem, dayIndex: number) => {
    if (item.recurrence_rule?.includes("DAILY")) {
      return true
    }
    if (item.recurrence_rule?.includes("WEEKLY") && item.days_of_week) {
      return item.days_of_week.includes(dayIndex)
    }
    // No recurrence - show on all days for now
    return true
  }

  // Get color for an item
  const getItemColor = (index: number) => {
    return SLOT_COLORS[index % SLOT_COLORS.length]
  }

  const formatWeekRange = () => {
    const endDate = new Date(currentWeekStart)
    endDate.setDate(endDate.getDate() + 6)
    const startMonth = currentWeekStart.toLocaleDateString("en-US", { month: "short" })
    const endMonth = endDate.toLocaleDateString("en-US", { month: "short" })
    const startDay = currentWeekStart.getDate()
    const endDay = endDate.getDate()
    const year = endDate.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading schedules...</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div
        className={cn(
          "border-r bg-background transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-72"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="w-full bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Schedule
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Schedule List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredSchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No schedules found
              </p>
            ) : (
              filteredSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors group",
                    selectedSchedule?.id === schedule.id
                      ? "bg-cyan-50 border border-cyan-200"
                      : "hover:bg-muted"
                  )}
                  onClick={() => setSelectedSchedule(schedule)}
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      schedule.is_active ? "bg-cyan-500" : "bg-gray-300"
                    )}
                  />
                  <span className="flex-1 text-sm font-medium truncate">
                    {schedule.name}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(schedule)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold ml-2">{formatWeekRange()}</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedSchedule && (
              <span className="text-sm text-muted-foreground">
                Viewing: <span className="font-medium text-foreground">{selectedSchedule.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          {!selectedSchedule ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Schedule Selected</h3>
              <p className="text-muted-foreground mb-4">
                Select a schedule from the sidebar or create a new one to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Schedule
              </Button>
            </div>
          ) : (
            <div className="min-w-[800px]">
              {/* Day Headers */}
              <div className="flex border-b bg-muted/30 sticky top-0 z-10">
                <div className="w-16 shrink-0 border-r" />
                {weekDays.map((date, index) => {
                  const isToday = date.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex-1 p-2 text-center border-r last:border-r-0",
                        isToday && "bg-cyan-50"
                      )}
                    >
                      <div className="text-xs text-muted-foreground">{dayNames[index]}</div>
                      <div
                        className={cn(
                          "text-lg font-semibold",
                          isToday && "text-cyan-600"
                        )}
                      >
                        {date.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Time Grid */}
              <div className="flex">
                {/* Time Labels */}
                <div className="w-16 shrink-0 border-r">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-12 border-b text-xs text-muted-foreground pr-2 text-right pt-0 -mt-2"
                    >
                      {hour === 12 ? "12PM" : hour > 12 ? `${hour - 12}PM` : `${hour}AM`}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((date, dayIndex) => {
                  const isToday = date.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "flex-1 border-r last:border-r-0 relative",
                        isToday && "bg-cyan-50/30"
                      )}
                    >
                      {/* Hour cells */}
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="h-12 border-b border-dashed hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleCellClick(dayIndex, hour)}
                        />
                      ))}

                      {/* Schedule Items */}
                      {scheduleItems
                        .filter((item) => shouldDisplayOnDay(item, dayIndex))
                        .map((item, itemIndex) => {
                          const style = getSlotStyle(item)
                          const color = getItemColor(itemIndex)
                          const contentName =
                            item.content_type === "playlist"
                              ? item.playlists?.name
                              : item.media?.name

                          return (
                            <div
                              key={`${item.id}-${dayIndex}`}
                              className={cn(
                                "absolute left-1 right-1 rounded-md border p-1 overflow-hidden cursor-pointer group",
                                color.bg,
                                color.border,
                                color.text
                              )}
                              style={style}
                              title={`${contentName}\n${item.start_time} - ${item.end_time}`}
                            >
                              <div className="text-xs font-medium truncate">
                                {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                              </div>
                              <div className="text-xs truncate opacity-80">
                                {contentName || "Unknown content"}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-white/50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteScheduleItem(item.id)
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )
                        })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Schedule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Schedule</DialogTitle>
            <DialogDescription>
              Create a new schedule to manage time-based content delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Schedule Name</Label>
              <Input
                id="name"
                value={newScheduleName}
                onChange={(e) => setNewScheduleName(e.target.value)}
                placeholder="e.g., Morning Content"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newScheduleDescription}
                onChange={(e) => setNewScheduleDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule} className="bg-cyan-500 hover:bg-cyan-600">
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
            <DialogDescription>Update schedule details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <Button onClick={handleEditSchedule} className="bg-cyan-500 hover:bg-cyan-600">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Time Slot Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Time Slot</DialogTitle>
            <DialogDescription>
              Add content to play during a specific time period
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Content Type */}
            <div>
              <Label>Content Type</Label>
              <Select
                value={itemContentType}
                onValueChange={(v: "playlist" | "media") => {
                  setItemContentType(v)
                  setItemContentId("")
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="playlist">
                    <div className="flex items-center">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Playlist
                    </div>
                  </SelectItem>
                  <SelectItem value="media">
                    <div className="flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Media
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Selection */}
            <div>
              <Label>
                {itemContentType === "playlist" ? "Select Playlist" : "Select Media"}
              </Label>
              <Select value={itemContentId} onValueChange={setItemContentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose content..." />
                </SelectTrigger>
                <SelectContent>
                  {itemContentType === "playlist"
                    ? playlists.map((playlist) => (
                        <SelectItem key={playlist.id} value={playlist.id}>
                          {playlist.name}
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

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={itemStartTime}
                  onChange={(e) => setItemStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={itemEndTime}
                  onChange={(e) => setItemEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <Label>Repeat</Label>
              <Select
                value={itemRecurrence}
                onValueChange={(v: "none" | "daily" | "weekly") => setItemRecurrence(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly on selected days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Days of Week */}
            {itemRecurrence === "weekly" && (
              <div>
                <Label className="mb-2 block">Days</Label>
                <div className="flex gap-1">
                  {dayNames.map((day, index) => (
                    <Button
                      key={day}
                      type="button"
                      variant={itemDaysOfWeek.includes(index) ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-10 h-10 p-0",
                        itemDaysOfWeek.includes(index) && "bg-cyan-500 hover:bg-cyan-600"
                      )}
                      onClick={() => toggleDayOfWeek(index)}
                    >
                      {day.charAt(0)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Priority */}
            <div>
              <Label>Priority (higher = more important)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={itemPriority}
                onChange={(e) => setItemPriority(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddScheduleItem} className="bg-cyan-500 hover:bg-cyan-600">
              Add Time Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
