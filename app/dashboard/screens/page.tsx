"use client"

import { Switch } from "@/components/ui/switch"
import { X, Plus } from "lucide-react" // Import X icon for closing modals, and Plus for button

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Eye,
  PlayCircle,
  ImageIcon,
  Tv,
  Smartphone,
  CheckCircle,
  Wifi,
  RotateCw,
  Edit,
  Circle,
  CheckCircle2,
  Calendar,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { transformScreenData } from "@/utils/transformScreenData"
import { ScreenPreviewModal } from "@/components/screen-preview-modal" // Import the real ScreenPreviewModal component instead of using placeholder
import { useRouter } from "next/navigation" // Import useRouter
// import { DashboardLayout } from "@/components/dashboard/layout" // Import DashboardLayout - REMOVED AS PER UPDATES

interface Screen {
  id: string
  name: string
  description?: string
  screen_code: string
  status: string
  location: string
  resolution: string
  orientation: string
  last_seen: string | null
  created_at: string
  playlists?: { id: string; name: string }[]
  media_id?: string
  screen_playlists?: { playlist_id: string; is_active: boolean; playlists?: { id: string; name: string } }[] // Added playlists relation
  screen_media?: { media_id: string; media?: { id: string; name: string } }[] // Added screen_media
  content_type?: "playlist" | "asset" | "schedule" | "none" // Added content_type
  enable_audio_management?: boolean
  screen_schedules?: { schedule_id: string; schedules?: { id: string; name: string } }[]
  }

interface Playlist {
  id: string
  name: string
  description?: string // Added for potentially richer display
}

interface MediaItem {
  id: string
  name: string
  mime_type: string
  file_size: number
}

interface WizardState {
  step: number
  pairingCode: string
  isPaired: boolean
  pairedDevice: any
  selectedContentIds: string[]
  name: string
  description: string
  location: string
  resolution: "1920x1080" | "3840x2160" | "1366x768" | "1280x720"
  orientation: "landscape" | "rotate-90" | "rotate-180" | "rotate-270"
  advancedOptions: {
    locationEnabled: boolean
    backgroundType: "color" | "image" | "transparent"
    defaultColor: string
    syncPlay: boolean
    showDownloadingStatus: boolean
    preloadAssets: boolean
    showOfflineIndicator: boolean
    mute: boolean
    notificationsEnabled: boolean // Added notificationsEnabled
  }
}

export default function ScreensPage() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [schedules, setSchedules] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [repairingScreen, setRepairingScreen] = useState<Screen | null>(null)
  const [newPairingCode, setNewPairingCode] = useState("")
  const [isCreatingScreen, setIsCreatingScreen] = useState(false)
  const [editingContentType, setEditingContentType] = useState<"playlist" | "asset">("playlist")
  const [previewingScreen, setPreviewingScreen] = useState<Screen | null>(null)
  const [editingSelectedContentIds, setEditingSelectedContentIds] = useState<string[]>([])

  const [screenLimits, setScreenLimits] = useState<{
    current: number
    limit: number
    canCreate: boolean
    plan: string
  } | null>(null)

  const [wizardState, setWizardState] = useState<WizardState>({
    step: 1,
    pairingCode: "",
    isPaired: false,
    pairedDevice: null,
    selectedContentIds: [],
    name: "",
    description: "",
    location: "",
    resolution: "1920x1080",
    orientation: "landscape",
    advancedOptions: {
      locationEnabled: false,
      backgroundType: "color",
      defaultColor: "#000000",
      syncPlay: false,
      showDownloadingStatus: true,
      preloadAssets: false,
      showOfflineIndicator: true,
      mute: false,
      notificationsEnabled: true, // Added notificationsEnabled
    },
  })

  const { toast } = useToast()
  const router = useRouter() // Import useRouter

  useEffect(() => {
    fetchScreenLimits()
    fetchScreens()
    fetchPlaylists()
    fetchMediaItems()
    fetchSchedules()
  }, [])

  const fetchScreenLimits = async () => {
    try {
      const response = await fetch("/api/screen-limits")
      if (response.ok) {
        const data = await response.json()
        setScreenLimits(data)
      }
    } catch (error) {
      console.error("Error fetching screen limits:", error)
    }
  }

  const fetchScreens = async () => {
    try {
      const response = await fetch("/api/screens")
      if (response.ok) {
        const data = await response.json()
        const transformedScreens = data.screens.map(transformScreenData)
        setScreens(transformedScreens)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch screens",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching screens:", error)
      toast({
        title: "Error",
        description: "Failed to fetch screens",
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
        setPlaylists(data.playlists)
      }
    } catch (error) {
      console.error("Error fetching playlists:", error)
    }
  }

  const fetchMediaItems = async () => {
    try {
      const response = await fetch("/api/media/list")
      if (response.ok) {
        const data = await response.json()
        setMediaItems(data.media || [])
      }
    } catch (error) {
      console.error("Error fetching media items:", error)
    }
  }

  const fetchSchedules = async () => {
    try {
      const response = await fetch("/api/schedules")
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error("Error fetching schedules:", error)
    }
  }

  const handlePairDevice = async () => {
    if (!wizardState.pairingCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a pairing code",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/devices/available`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_code: wizardState.pairingCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Invalid pairing code or device not found",
          variant: "destructive",
        })
        return
      }

      setWizardState((prev) => ({
        ...prev,
        isPaired: true,
        pairedDevice: data.device,
      }))

      toast({
        title: "Device Found",
        description: "Device ready for pairing. Continue to complete setup.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate pairing code",
        variant: "destructive",
      })
    }
  }

  const nextStep = () => {
    setWizardState((prev) => ({ ...prev, step: prev.step + 1 }))
  }

  const prevStep = () => {
    setWizardState((prev) => ({ ...prev, step: prev.step - 1 }))
  }

  const resetWizard = () => {
    setWizardState({
      step: 1,
      pairingCode: "",
      isPaired: false,
      pairedDevice: null,
      selectedContentIds: [],
      name: "",
      description: "",
      location: "",
      resolution: "1920x1080",
      orientation: "landscape",
      advancedOptions: {
        locationEnabled: false,
        backgroundType: "color",
        defaultColor: "#000000",
        syncPlay: false,
        showDownloadingStatus: true,
        preloadAssets: false,
        showOfflineIndicator: true,
        mute: false,
        notificationsEnabled: true, // Reset notificationsEnabled
      },
    })
  }

  const handleCreateScreen = async () => {
    if (screenLimits && !screenLimits.canCreate) {
      toast({
        title: "Screen Limit Reached",
        description: `Your ${screenLimits.plan} plan allows ${screenLimits.limit} screen${screenLimits.limit > 1 ? "s" : ""}. Please upgrade to create more screens.`,
        variant: "destructive",
      })
      return
    }

    if (!wizardState.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a screen name",
        variant: "destructive",
      })
      return
    }

    if (!wizardState.isPaired || !wizardState.pairedDevice) {
      toast({
        title: "Error",
        description: "Please pair a device first",
        variant: "destructive",
      })
      return
    }

    setCreating(true)

    try {
      console.log("[v0] Creating screen with content:", {
        name: wizardState.name,
        selectedContentIds: wizardState.selectedContentIds,
        contentCount: wizardState.selectedContentIds.length,
      })

      const screenResponse = await fetch("/api/screens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: wizardState.name,
          description: wizardState.description,
          location: wizardState.location,
          orientation: wizardState.orientation,
          resolution: wizardState.resolution,
          content_type: wizardState.selectedContentIds.length > 0 ? "playlist" : "none",
          enable_audio_management: wizardState.advancedOptions.mute,
        }),
      })

      const screenData = await screenResponse.json()

      if (!screenResponse.ok) {
        throw new Error(screenData.error || "Failed to create screen")
      }

      console.log("[v0] Screen created successfully:", screenData.screen.id)

      // Pair device to screen
      const pairResponse = await fetch("/api/devices/pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceCode: wizardState.pairedDevice.device_code,
          screenId: screenData.screen.id,
        }),
      })

      const pairData = await pairResponse.json()

      if (!pairResponse.ok) {
        throw new Error(pairData.error || "Failed to pair device")
      }

      console.log("[v0] Device paired successfully")

      if (wizardState.selectedContentIds.length > 0) {
        console.log("[v0] Starting content assignment for", wizardState.selectedContentIds.length, "items")

        const assignmentPromises = wizardState.selectedContentIds.map(async (contentId, index) => {
          const isPlaylist = playlists.some((p) => p.id === contentId)

          console.log(`[v0] Assigning content ${index + 1}/${wizardState.selectedContentIds.length}:`, {
            contentId,
            isPlaylist,
          })

          if (isPlaylist) {
            const response = await fetch(`/api/screens/${screenData.screen.id}/playlists`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                playlist_id: contentId,
                is_active: true,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              console.error("[v0] Failed to assign playlist:", errorData)
              throw new Error(errorData.error || "Failed to assign playlist")
            }

            console.log("[v0] Playlist assigned successfully")
          } else {
            // It's a media item - update screen's media_id
            const response = await fetch(`/api/screens/${screenData.screen.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                media_id: contentId,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              console.error("[v0] Failed to assign media:", errorData)
              throw new Error(errorData.error || "Failed to assign media")
            }

            console.log("[v0] Media assigned successfully")
          }
        })

        await Promise.all(assignmentPromises)
        console.log("[v0] All content assigned successfully")
      } else {
        console.log("[v0] No content selected to assign")
      }

      toast({
        title: "Success",
        description: "Screen created and content assigned successfully!",
      })

      // Reset wizard and close modal
      resetWizard()
      setIsCreateDialogOpen(false)
      fetchScreens()
      fetchScreenLimits()
    } catch (error) {
      console.error("[v0] Screen creation error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create screen",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  // createScreen function seems to be a duplicate or older version of handleCreateScreen and might not be needed or should be removed/merged.
  // Based on the updates, handleCreateScreen is the one being modified and used.
  // I'll keep it here for now but it's worth reviewing if this function is necessary.
  const createScreen = async () => {
    try {
      setIsCreatingScreen(true)

      // Pair device to screen
      const pairResponse = await fetch("/api/devices/pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceCode: wizardState.pairedDevice.device_code,
          screenId: "", //TODO: Fix this
        }),
      })

      const pairData = await pairResponse.json()

      if (!pairResponse.ok) {
        throw new Error(pairData.error || "Failed to pair device")
      }

      const screenData = {
        name: wizardState.name,
        location: wizardState.location,
        resolution: wizardState.resolution,
        orientation: wizardState.orientation,
        content_type: wizardState.selectedContentIds.length > 0 ? "playlist" : "none", // This logic might need adjustment if media items are also selected
        ...(wizardState.selectedContentIds.length > 0
          ? { playlist_ids: wizardState.selectedContentIds } // Assuming selected are playlists for this older function
          : {}),
      }

      const screenResponse = await fetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(screenData),
      })

      const { screen: createdScreen, error: screenError } = await screenResponse.json()

      if (!screenResponse.ok) {
        throw new Error(screenError || "Failed to create screen")
      }

      // This part seems to be for assigning playlists specifically, might need to be updated for mixed content
      if (wizardState.selectedContentIds.length > 0) {
        for (const playlistId of wizardState.selectedContentIds) {
          await fetch(`/api/screens/${createdScreen.id}/playlists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playlist_id: playlistId, is_active: true }),
          })
        }
      }

      toast({
        title: "Success",
        description: "Screen created and content assigned successfully!",
      })

      setIsCreateDialogOpen(false)
      fetchScreens()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create screen",
        variant: "destructive",
      })
    } finally {
      setIsCreatingScreen(false)
      setWizardState({
        step: 1,
        pairingCode: "",
        isPaired: false,
        pairedDevice: null,
        contentType: "",
        selectedContentIds: [],
        name: "",
        description: "",
        location: "",
        resolution: "1920x1080",
        orientation: "landscape",
        advancedOptions: {
          locationEnabled: false,
          backgroundType: "color",
          defaultColor: "#000000",
          syncPlay: false,
          showDownloadingStatus: true,
          preloadAssets: false,
          showOfflineIndicator: true,
          mute: false,
          notificationsEnabled: true, // Reset notificationsEnabled
        },
      })
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Wifi className="h-12 w-12 mx-auto text-cyan-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Connect Your Screen</h3>
        <p className="text-gray-600 mb-6">Enter the pairing code displayed on your device player.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="pairing-code">Device Pairing Code</Label>
          <Input
            id="pairing-code"
            placeholder="Enter code from device (e.g., APG13)"
            value={wizardState.pairingCode}
            onChange={(e) => setWizardState((prev) => ({ ...prev, pairingCode: e.target.value.toUpperCase() }))}
            className="font-mono"
          />
        </div>

        {wizardState.isPaired && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">Device Found & Ready</span>
          </div>
        )}

        <Button
          onClick={handlePairDevice}
          disabled={!wizardState.pairingCode.trim() || wizardState.isPaired}
          className="w-full"
        >
          {wizardState.isPaired ? "Device Ready" : "Find Device"}
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Select Content</h3>
        <p className="text-gray-600">Choose playlists and/or media assets to display on this screen.</p>
      </div>

      <div className="space-y-6">
        {/* Playlists Section */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-cyan-500" />
            Playlists
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
            {playlists.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No playlists available</p>
            ) : (
              playlists.map((playlist) => (
                <Card
                  key={playlist.id}
                  className={`cursor-pointer transition-colors ${
                    wizardState.selectedContentIds.includes(playlist.id)
                      ? "ring-2 ring-cyan-500 bg-cyan-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setWizardState((prev) => ({
                      ...prev,
                      selectedContentIds: prev.selectedContentIds.includes(playlist.id)
                        ? prev.selectedContentIds.filter((id) => id !== playlist.id)
                        : [...prev.selectedContentIds, playlist.id],
                    }))
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {wizardState.selectedContentIds.includes(playlist.id) ? (
                          <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        <div>
                          <h4 className="font-medium">{playlist.name}</h4>
                          {playlist.description && <p className="text-sm text-gray-600">{playlist.description}</p>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Media Assets Section */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-cyan-500" />
            Media Assets
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
            {mediaItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No media assets available</p>
            ) : (
              mediaItems.map((media) => (
                <Card
                  key={media.id}
                  className={`cursor-pointer transition-colors ${
                    wizardState.selectedContentIds.includes(media.id)
                      ? "ring-2 ring-cyan-500 bg-cyan-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setWizardState((prev) => ({
                      ...prev,
                      selectedContentIds: prev.selectedContentIds.includes(media.id)
                        ? prev.selectedContentIds.filter((id) => id !== media.id)
                        : [...prev.selectedContentIds, media.id],
                    }))
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {wizardState.selectedContentIds.includes(media.id) ? (
                          <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        <div>
                          <h4 className="font-medium">{media.name}</h4>
                          <p className="text-xs text-gray-500">{media.mime_type}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <RotateCw className="h-12 w-12 mx-auto text-cyan-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Screen Orientation</h3>
        <p className="text-gray-600">Select how the content should be oriented on your screen.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { value: "landscape", label: "Landscape", icon: Tv },
          { value: "rotate-90", label: "Rotate 90°", icon: Smartphone },
          { value: "rotate-180", label: "Rotate 180°", icon: Tv },
          { value: "rotate-270", label: "Rotate 270°", icon: Smartphone },
        ].map(({ value, label, icon: Icon }) => (
          <Card
            key={value}
            className={`cursor-pointer transition-colors ${wizardState.orientation === value ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"}`}
            onClick={() => setWizardState((prev) => ({ ...prev, orientation: value as any }))}
          >
            <CardContent className="p-4 text-center">
              <Icon className="h-8 w-8 mx-auto text-cyan-500 mb-2" />
              <h4 className="font-medium">{label}</h4>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4 pt-4">
        <div>
          <Label htmlFor="screen-name">Screen Name</Label>
          <Input
            id="screen-name"
            placeholder="Enter screen name"
            value={wizardState.name}
            onChange={(e) => setWizardState((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="screen-description">Description (Optional)</Label>
          <Input
            id="screen-description"
            placeholder="Enter description"
            value={wizardState.description}
            onChange={(e) => setWizardState((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="screen-location">Location (Optional)</Label>
          <Input
            id="screen-location"
            placeholder="Enter location"
            value={wizardState.location}
            onChange={(e) => setWizardState((prev) => ({ ...prev, location: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="screen-resolution">Resolution</Label>
          <Select
            value={wizardState.resolution}
            onValueChange={(value) => setWizardState((prev) => ({ ...prev, resolution: value as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
              <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
              <SelectItem value="1366x768">1366x768 (HD)</SelectItem>
              <SelectItem value="1280x720">1280x720 (HD Ready)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Advanced Options</h3>
        <p className="text-gray-600">Configure additional settings for your screen.</p>
      </div>

      <div className="space-y-4 max-h-64 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <Label>Location Services</Label>
            <p className="text-sm text-gray-600">Enable location-based features</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.locationEnabled}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, locationEnabled: checked },
              }))
            }
          />
        </div>

        <div>
          <Label>Background Type</Label>
          <Select
            value={wizardState.advancedOptions.backgroundType}
            onValueChange={(value: "color" | "image" | "transparent") =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, backgroundType: value },
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="color">Solid Color</SelectItem>
              <SelectItem value="image">Background Image</SelectItem>
              <SelectItem value="transparent">Transparent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {wizardState.advancedOptions.backgroundType === "color" && (
          <div>
            <Label>Default Color</Label>
            <Input
              type="color"
              value={wizardState.advancedOptions.defaultColor}
              onChange={(e) =>
                setWizardState((prev) => ({
                  ...prev,
                  advancedOptions: { ...prev.advancedOptions, defaultColor: e.target.value },
                }))
              }
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label>Sync Play</Label>
            <p className="text-sm text-gray-600">Synchronize playback across screens</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.syncPlay}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, syncPlay: checked },
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show Downloading Status</Label>
            <p className="text-sm text-gray-600">Display download progress</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.showDownloadingStatus}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, showDownloadingStatus: checked },
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Preload Assets in Playlist</Label>
            <p className="text-sm text-gray-600">Cache content for smoother playback</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.preloadAssets}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, preloadAssets: checked },
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show Offline Indicator</Label>
            <p className="text-sm text-gray-600">Display connection status</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.showOfflineIndicator}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, showOfflineIndicator: checked },
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Mute</Label>
            <p className="text-sm text-gray-600">Disable audio playback</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.mute}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, mute: checked },
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Notifications</Label>
            <p className="text-sm text-gray-600">Enable screen notifications</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.notificationsEnabled}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, notificationsEnabled: checked },
              }))
            }
          />
        </div>
      </div>
    </div>
  )

  const handleUpdateScreen = async () => {
    if (!editingScreen) return

    console.log("[v0] handleUpdateScreen - content type:", editingContentType)
    console.log("[v0] handleUpdateScreen - selectedContentIds:", editingSelectedContentIds)

    setUpdating(true)
    try {
      console.log("[v0] Updating screen with data:", editingScreen)

      const response = await fetch(`/api/screens/${editingScreen.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editingScreen,
          content_type: editingContentType,
          selectedContentIds: editingSelectedContentIds,
          enable_audio_management: editingScreen.enable_audio_management,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Screen update response:", data)
        const transformedScreen = transformScreenData(data.screen)
        await fetchScreens()
        setEditingScreen(null)
        setEditingSelectedContentIds([])
        toast({
          title: "Success",
          description: "Screen updated successfully",
        })
      } else {
        const error = await response.json()
        console.log("[v0] Screen update error:", error)
        toast({
          title: "Error",
          description: error.error || "Failed to update screen",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating screen:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteScreen = async (id: string) => {
    try {
      const response = await fetch(`/api/screens/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setScreens((prev) => prev.filter((screen) => screen.id !== id))
        // Refresh limits after deleting screen
        fetchScreenLimits()
        toast({
          title: "Success",
          description: "Screen deleted successfully",
        })
      } else {
        const error = await response.json()
        console.log("[v0] Screen delete error:", error)
        toast({
          title: "Error",
          description: error.error || "Failed to delete screen",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete screen",
        variant: "destructive",
      })
    }
  }

  const filteredScreens = screens.filter(
    (screen) =>
      screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screen.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screen.screen_code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const openEditDialog = (screen: Screen) => {
    console.log("[v0] openEditDialog - screen:", screen)
    console.log("[v0] openEditDialog - screen.screen_playlists:", screen.screen_playlists)
    console.log("[v0] openEditDialog - screen.screen_media:", screen.screen_media)
    console.log("[v0] openEditDialog - screen.media_id:", screen.media_id)

    setEditingScreen(screen)

    // Determine the initial content_type based on existing assignments
    if (screen.screen_playlists && screen.screen_playlists.length > 0) {
      setEditingContentType("playlist")
    } else if (screen.screen_schedules && screen.screen_schedules.length > 0) {
      setEditingContentType("schedule")
    } else if (screen.screen_media && screen.screen_media.length > 0) {
      setEditingContentType("asset")
    } else if (screen.media_id) {
      setEditingContentType("asset")
    } else {
      setEditingContentType("playlist") // Default to playlist if unsure
    }

    const selectedIds: string[] = []

    // Add all playlists from screen_playlists
    if (screen.screen_playlists) {
      screen.screen_playlists.forEach((sp: any) => {
        if (sp.playlist_id) {
          selectedIds.push(sp.playlist_id)
        }
      })
    }

    // Add all schedules from screen_schedules
    if (screen.screen_schedules) {
      screen.screen_schedules.forEach((ss: any) => {
        if (ss.schedule_id) {
          selectedIds.push(ss.schedule_id)
        }
      })
    }

    // Add all media from screen_media junction table
    if (screen.screen_media) {
      screen.screen_media.forEach((sm: any) => {
        if (sm.media_id) {
          selectedIds.push(sm.media_id)
        }
      })
    }

    // Fallback: if no screen_media but has media_id, add it
    if (!screen.screen_media?.length && screen.media_id) {
      selectedIds.push(screen.media_id)
    }

    console.log("[v0] openEditDialog - selectedIds:", selectedIds)
    setEditingSelectedContentIds(selectedIds)
  }

  return (
    // <DashboardLayout> - REMOVED AS PER UPDATES
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Screens</h1>
          <p className="text-muted-foreground">Manage your digital signage screens</p>
          {screenLimits && (
            <p className="text-sm text-muted-foreground mt-1">
              {screenLimits.limit === -1
                ? `${screenLimits.current} screens (Unlimited)`
                : `${screenLimits.current} / ${screenLimits.limit} screens used`}
            </p>
          )}
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-cyan-500 hover:bg-cyan-600"
          disabled={screenLimits ? !screenLimits.canCreate : false}
        >
          <Plus className="h-4 w-4 mr-2" />
          {screenLimits && !screenLimits.canCreate ? "Limit Reached" : "Create Screen"}
        </Button>
      </div>

      {/* Search Section */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search screens by name, location, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <p className="text-sm text-gray-600">Loading screens...</p>
        </div>
      ) : filteredScreens.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Tv className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {searchTerm ? "No screens match your search" : "No screens configured yet"}
            </p>
            <Button
              onClick={() => {
                resetWizard()
                setIsCreateDialogOpen(true)
              }}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              Create First Screen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScreens.map((screen) => (
            <Card key={screen.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Tv className="h-8 w-8 text-cyan-500" />
                    <div>
                      <h3 className="font-semibold text-lg">{screen.name}</h3>
                      {screen.location && <p className="text-sm text-gray-600">{screen.location}</p>}
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      screen.status === "online"
                        ? "bg-green-100 text-green-700"
                        : screen.status === "paired"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {screen.status}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Code:</span>
                    <span className="font-mono">{screen.screen_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resolution:</span>
                    <span>{screen.resolution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Orientation:</span>
                    <span className="capitalize">{screen.orientation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Content:</span>
                    <span className="capitalize">
                      {screen.screen_playlists && screen.screen_playlists.length > 0
                        ? "Playlist"
                        : screen.screen_schedules && screen.screen_schedules.length > 0
                          ? "Schedule"
                          : screen.screen_media && screen.screen_media.length > 0
                            ? "Media Asset"
                            : screen.media_id
                              ? "Media Asset"
                              : "None"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assigned:</span>
                    <span
                      className="truncate max-w-[180px]"
                      title={
                        screen.screen_playlists && screen.screen_playlists.length > 0
                          ? screen.screen_playlists.map((sp: any) => sp.playlists?.name || "Unknown").join(", ")
                          : screen.screen_schedules && screen.screen_schedules.length > 0
                            ? screen.screen_schedules.map((ss: any) => ss.schedules?.name || "Unknown").join(", ")
                            : screen.screen_media && screen.screen_media.length > 0
                              ? screen.screen_media.map((sm: any) => sm.media?.name || "Unknown").join(", ")
                              : "Not assigned"
                      }
                    >
                      {screen.screen_playlists && screen.screen_playlists.length > 0
                        ? screen.screen_playlists.map((sp: any) => sp.playlists?.name || "Unknown").join(", ")
                        : screen.screen_schedules && screen.screen_schedules.length > 0
                          ? screen.screen_schedules.map((ss: any) => ss.schedules?.name || "Unknown").join(", ")
                          : screen.screen_media && screen.screen_media.length > 0
                            ? screen.screen_media.map((sm: any) => sm.media?.name || "Unknown").join(", ")
                            : "Not assigned"}
                    </span>
                  </div>
                  {/* End content type and name display */}
                  {screen.last_seen && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Seen:</span>
                      <span>{new Date(screen.last_seen).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(screen)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPreviewingScreen(screen)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteScreen(screen.id)}
                        className="text-red-600 focus:text-red-700"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Wizard Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Fixed Header */}
            <div className="p-6 border-b shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {wizardState.step === 1 && "Connect Device"}
                  {wizardState.step === 2 && "Select Content"}
                  {wizardState.step === 3 && "Configure Screen"}
                  {wizardState.step === 4 && "Advanced Settings"}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsCreateDialogOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {/* Progress Bar */}
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      step <= wizardState.step ? "bg-cyan-500" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="space-y-4">
                {wizardState.step === 1 && renderStep1()}
                {wizardState.step === 2 && renderStep2()}
                {wizardState.step === 3 && renderStep3()}
                {wizardState.step === 4 && renderStep4()}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t shrink-0 bg-gray-50/50">
              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <div className="flex gap-3">
                  {wizardState.step > 1 && (
                    <Button variant="outline" onClick={prevStep}>
                      Back
                    </Button>
                  )}
                  {wizardState.step < 4 && (
                    <Button
                      onClick={nextStep}
                      disabled={wizardState.step === 1 && !wizardState.isPaired}
                      className="bg-cyan-500 hover:bg-cyan-600"
                    >
                      Next
                    </Button>
                  )}
                  {wizardState.step === 4 && (
                    <Button
                      onClick={handleCreateScreen}
                      disabled={creating || !wizardState.name.trim()}
                      className="bg-cyan-500 hover:bg-cyan-600"
                    >
                      {creating ? "Creating..." : "Create Screen"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Dialog */}
      {editingScreen && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 bg-[rgba(41,40,40,0.25)]">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Fixed Header */}
            <div className="p-6 border-b shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">Edit Screen</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingScreen(null)
                    setEditingSelectedContentIds([])
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Screen Name</Label>
                  <Input
                    id="edit-name"
                    value={editingScreen.name}
                    onChange={(e) => setEditingScreen({ ...editingScreen, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={editingScreen.location || ""}
                    onChange={(e) => setEditingScreen({ ...editingScreen, location: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-resolution">Resolution</Label>
                  <Select
                    value={editingScreen.resolution}
                    onValueChange={(value) => setEditingScreen({ ...editingScreen, resolution: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">1920×1080 (Full HD)</SelectItem>
                      <SelectItem value="3840x2160">3840×2160 (4K)</SelectItem>
                      <SelectItem value="1366x768">1366×768 (HD)</SelectItem>
                      <SelectItem value="1280x720">1280×720 (HD Ready)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-orientation">Orientation</Label>
                  <Select
                    value={editingScreen.orientation}
                    onValueChange={(value) => setEditingScreen({ ...editingScreen, orientation: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="rotate-90">Rotate 90°</SelectItem>
                      <SelectItem value="rotate-180">Rotate 180°</SelectItem>
                      <SelectItem value="rotate-270">Rotate 270°</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <Label className="text-base font-semibold">Advanced Options</Label>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mute</Label>
                      <p className="text-sm text-gray-600">Disable audio playback</p>
                    </div>
                    <Switch
                      checked={editingScreen.enable_audio_management || false}
                      onCheckedChange={(checked) =>
                        setEditingScreen({ ...editingScreen, enable_audio_management: checked })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <Label className="text-base font-semibold">Assigned Content</Label>

                  {/* Content Type Selection */}
                  <div className="flex gap-4">
                    <Button
                      variant={editingContentType === "playlist" ? "default" : "outline"}
                      className={editingContentType === "playlist" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
                      onClick={() => setEditingContentType("playlist")}
                    >
                      Playlists
                    </Button>
                    <Button
                      variant={editingContentType === "asset" ? "default" : "outline"}
                      className={editingContentType === "asset" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
                      onClick={() => setEditingContentType("asset")}
                    >
                      Media Assets
                    </Button>
                    <Button
                      variant={editingContentType === "schedule" ? "default" : "outline"}
                      className={editingContentType === "schedule" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
                      onClick={() => setEditingContentType("schedule")}
                    >
                      Schedules
                    </Button>
                  </div>

                  {/* Playlists Section */}
                  {editingContentType === "playlist" && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-cyan-500" />
                        Playlists
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50/50 scrollbar-hide">
                        {playlists.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No playlists available</p>
                        ) : (
                          playlists.map((playlist) => (
                            <div
                              key={playlist.id}
                              className={`p-3 rounded-lg cursor-pointer transition-all ${
                                editingSelectedContentIds.includes(playlist.id)
                                  ? "bg-cyan-50 ring-2 ring-cyan-500"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                setEditingSelectedContentIds((prev) =>
                                  prev.includes(playlist.id)
                                    ? prev.filter((id) => id !== playlist.id)
                                    : [...prev, playlist.id],
                                )
                              }}
                            >
                              <div className="flex items-center gap-3 text-popover">
                                {editingSelectedContentIds.includes(playlist.id) ? (
                                  <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-300" />
                                )}
                                <span className="text-sm font-medium text-popover">{playlist.name}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Media Assets Section */}
                  {editingContentType === "asset" && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-cyan-500" />
                        Media Assets
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50/50 scrollbar-hide">
                        {mediaItems.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No media assets available</p>
                        ) : (
                          mediaItems.map((media) => (
                            <div
                              key={media.id}
                              className={`p-3 rounded-lg cursor-pointer transition-all ${
                                editingSelectedContentIds.includes(media.id)
                                  ? "bg-cyan-50 ring-2 ring-cyan-500"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                setEditingSelectedContentIds((prev) =>
                                  prev.includes(media.id) ? prev.filter((id) => id !== media.id) : [...prev, media.id],
                                )
                              }}
                            >
                              <div className="flex items-center gap-3">
                                {editingSelectedContentIds.includes(media.id) ? (
                                  <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-300" />
                                )}
                                <div>
                                  <span className="text-sm font-medium block">{media.name}</span>
                                  <p className="text-xs text-gray-500">{media.mime_type}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Schedules Section */}
                  {editingContentType === "schedule" && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-cyan-500" />
                        Schedules
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50/50 scrollbar-hide">
                        {schedules.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No schedules available</p>
                        ) : (
                          schedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className={`p-3 rounded-lg cursor-pointer transition-all ${
                                editingSelectedContentIds.includes(schedule.id)
                                  ? "bg-cyan-50 ring-2 ring-cyan-500"
                                  : "bg-white hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                setEditingSelectedContentIds((prev) =>
                                  prev.includes(schedule.id) ? prev.filter((id) => id !== schedule.id) : [...prev, schedule.id],
                                )
                              }}
                            >
                              <div className="flex items-center gap-3 text-popover">
                                {editingSelectedContentIds.includes(schedule.id) ? (
                                  <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-300" />
                                )}
                                <span className="text-sm font-medium text-popover">{schedule.name}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t shrink-0 bg-background">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingScreen(null)
                    setEditingSelectedContentIds([])
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateScreen} disabled={updating} className="bg-cyan-500 hover:bg-cyan-600">
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add ScreenPreviewModal component at the end before closing tag */}
      <ScreenPreviewModal
        screen={previewingScreen}
        isOpen={!!previewingScreen}
        onClose={() => setPreviewingScreen(null)}
      />
    </div>
    // </DashboardLayout> - REMOVED AS PER UPDATES
  )
}
