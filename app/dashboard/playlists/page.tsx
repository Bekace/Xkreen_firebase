"use client"

import type React from "react"

import { DialogFooter } from "@/components/ui/dialog"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PlayCircle,
  Plus,
  Search,
  Trash2,
  ImageIcon,
  Video,
  Eye,
  Play,
  Pause,
  SkipForward,
  Settings,
  FileText,
  GripVertical,
  Edit,
  SkipBack,
  Volume2,
  Maximize,
  Minimize,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Playlist {
  id: string
  name: string
  description: string
  created_at: string
  playlist_media: { count: number }[]
  background_color?: string
  scale_image?: string
  scale_video?: string
  scale_document?: string
  shuffle?: boolean
  default_transition?: string
}

interface PlaylistItem {
  id: string
  position: number
  duration_override: number
  media: {
    id: string
    name: string
    file_path: string
    mime_type: string
    file_size: number
  }
  start_time?: number
  end_time?: number
  notes?: string
  transition_type?: "fade" | "slide-left" | "slide-right" | "cross-fade" | "zoom"
  transition_duration?: number
}

interface Media {
  id: string
  name: string
  file_path: string
  mime_type: string
  file_size: number
  created_at: string
}

const isYouTubeVideo = (media: { mime_type?: string; file_path?: string }) => {
  return (
    media.mime_type === "video/youtube" ||
    media.file_path?.includes("youtube.com") ||
    media.file_path?.includes("youtu.be") ||
    media.file_path?.includes("youtube-nocookie.com")
  )
}

const getYouTubeUrlWithAutoplay = (url: string) => {
  try {
    const urlObj = new URL(url)
    urlObj.searchParams.set("autoplay", "1")
    urlObj.searchParams.set("mute", "1")
    urlObj.searchParams.set("controls", "0")
    urlObj.searchParams.set("showinfo", "0")
    urlObj.searchParams.set("fs", "0")
    urlObj.searchParams.set("modestbranding", "1")
    urlObj.searchParams.set("iv_load_policy", "3")
    return urlObj.toString()
  } catch {
    // If URL parsing fails, try to add parameters manually
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}autoplay=1&mute=1&controls=0&showinfo=0&fs=0&modestbranding=1&iv_load_policy=3`
  }
}

const isGoogleSlides = (media: { mime_type?: string; file_path?: string }) => {
  return (
    media.mime_type === "application/vnd.google-apps.presentation" ||
    media.file_path?.includes("docs.google.com/presentation") ||
    media.file_path?.includes("slides.google")
  )
}

const getGoogleSlidesEmbedUrl = (url: string) => {
  if (url.includes("/embed")) {
    return url
  }
  return url.replace("/edit", "/embed").replace("/view", "/embed")
}

const PlaylistPreviewModal = ({
  playlist,
  isOpen,
  onClose,
  backgroundColor = "#000000",
}: {
  playlist: Playlist
  isOpen: boolean
  onClose: () => void
  backgroundColor?: string
}) => {
  const [items, setItems] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoLoop, setAutoLoop] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isTransitioning, setIsTransitioning] = useState(false)
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])

  const goToNext = useCallback(() => {
    console.log("[v0] goToNext called, currentIndex:", currentIndex, "total items:", items.length)

    if (items.length === 0) {
      console.log("[v0] No items to advance to")
      return
    }

    const nextIndex = currentIndex + 1 < items.length ? currentIndex + 1 : autoLoop ? 0 : currentIndex

    if (nextIndex === currentIndex && !autoLoop) {
      console.log("[v0] Reached end of playlist, stopping")
      setIsPlaying(false)
      return
    }

    const nextItem = items[nextIndex]
    const transitionType = nextItem?.transition_type || "fade"
    const transitionDuration = nextItem?.transition_duration || 0.8

    console.log("[v0] Applying transition:", transitionType, "duration:", transitionDuration)
    console.log("[v0] Next item transition data:", {
      transition_type: nextItem?.transition_type,
      transition_duration: nextItem?.transition_duration,
      name: nextItem?.media?.name,
    })

    setIsTransitioning(true)

    setTimeout(() => {
      setCurrentIndex(nextIndex)
      setTimeRemaining(nextItem?.duration_override || 10)
      setIsTransitioning(false)
      console.log("[v0] Advanced to item", nextIndex + 1, "of", items.length)
    }, transitionDuration * 1000)
  }, [currentIndex, items, autoLoop])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      const prevItem = items[prevIndex]
      const transitionType = prevItem?.transition_type || "fade"
      const transitionDuration = prevItem?.transition_duration || 0.8

      console.log("[v0] Previous transition:", transitionType, "duration:", transitionDuration)

      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(prevIndex)
        setTimeRemaining(prevItem?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    } else if (autoLoop) {
      const lastIndex = items.length - 1
      const lastItem = items[lastIndex]
      const transitionType = lastItem?.transition_type || "fade"
      const transitionDuration = lastItem?.transition_duration || 0.8

      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(lastIndex)
        setTimeRemaining(lastItem?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    }
  }, [currentIndex, items, autoLoop])

  useEffect(() => {
    if (isOpen && playlist) {
      console.log("[v0] Fetching items for playlist:", playlist.name)
      fetchPlaylistItems()
    } else {
      setCurrentIndex(0)
      setIsPlaying(false)
      setTimeRemaining(0)
      setItems([])
      setIsFullscreen(false)
    }
  }, [isOpen, playlist])

  useEffect(() => {
    if (items.length > 0 && !isPlaying) {
      console.log("[v0] Auto-starting playlist playback")
      setIsPlaying(true)
    }
  }, [items, isPlaying])

  const fetchPlaylistItems = async () => {
    if (!playlist) {
      console.log("[v0] Cannot fetch items: playlist is null")
      return
    }

    setLoading(true)
    try {
      console.log("[v0] Fetching playlist items for ID:", playlist.id)
      const response = await fetch(`/api/playlists/${playlist.id}`)
      if (response.ok) {
        const data = await response.json()
        const sortedItems =
          data.playlist.playlist_items?.sort((a: PlaylistItem, b: PlaylistItem) => a.position - b.position) || []
        console.log("[v0] Loaded playlist items:", sortedItems.length)
        console.log("[v0] First item transition data:", {
          transition_type: sortedItems[0]?.transition_type,
          transition_duration: sortedItems[0]?.transition_duration,
        })
        setItems(sortedItems)
        setCurrentIndex(0)
        setTimeRemaining(sortedItems[0]?.duration_override || 10)
      }
    } catch (error) {
      console.error("Error fetching playlist items:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = () => {
    if (items.length === 0) return
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setTimeRemaining(items[nextIndex].duration_override || 10)
    } else if (autoLoop) {
      setCurrentIndex(0)
      setTimeRemaining(items[0]?.duration_override || 10)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      setCurrentIndex(prevIndex)
      setTimeRemaining(items[prevIndex].duration_override || 10)
    } else if (autoLoop) {
      const lastIndex = items.length - 1
      setCurrentIndex(lastIndex)
      setTimeRemaining(items[lastIndex]?.duration_override || 10)
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(0)
    setTimeRemaining(items[0]?.duration_override || 10)
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const getTransitionStyles = (isTransitioning: boolean) => {
    const item = items[currentIndex]
    const transitionType = item?.transition_type || "fade"
    const transitionDuration = item?.transition_duration || 0.8

    const baseStyle = {
      transition: `all ${transitionDuration}s ease-in-out`,
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }

    if (!isTransitioning) {
      return {
        ...baseStyle,
        opacity: 1,
        transform: "translateX(0) translateY(0) scale(1)",
      }
    }

    // Apply different transition effects based on type
    switch (transitionType) {
      case "slide-left":
        return {
          ...baseStyle,
          opacity: 0,
          transform: "translateX(-100%)",
        }
      case "slide-right":
        return {
          ...baseStyle,
          opacity: 0,
          transform: "translateX(100%)",
        }
      case "zoom":
        return {
          ...baseStyle,
          opacity: 0,
          transform: "scale(0.8)",
        }
      case "cross-fade":
        return {
          ...baseStyle,
          opacity: 0,
          transform: "scale(1.05)",
        }
      case "fade":
      default:
        return {
          ...baseStyle,
          opacity: 0,
          transform: "translateX(0) translateY(0) scale(1)",
        }
    }
  }

  const renderMedia = () => {
    if (!items.length || currentIndex >= items.length) return null

    const item = items[currentIndex]
    const mediaStyle = getTransitionStyles(isTransitioning)

    if (isYouTubeVideo(item.media)) {
      const embedUrl = getYouTubeUrlWithAutoplay(item.media.file_path)
      return (
        <div className="relative w-full h-full overflow-hidden">
          <iframe
            key={item.id}
            src={embedUrl}
            style={mediaStyle}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            title={item.media.name}
          />
        </div>
      )
    }

    if (isGoogleSlides(item.media)) {
      const embedUrl = getGoogleSlidesEmbedUrl(item.media.file_path)
      return (
        <div className="relative w-full h-full overflow-hidden">
          <iframe
            src={embedUrl}
            style={mediaStyle}
            className="w-full h-full border-0"
            allowFullScreen
            title={item.media.name}
          />
        </div>
      )
    }

    return (
      <div className="relative w-full h-full overflow-hidden">
        {item.media.mime_type?.startsWith("image/") ? (
          <img src={item.media.file_path || "/placeholder.svg"} alt={item.media.name} style={mediaStyle} />
        ) : item.media.mime_type?.startsWith("video/") ? (
          <video src={item.media.file_path} style={mediaStyle} autoPlay muted={volume === 0} onEnded={goToNext} />
        ) : (
          <div style={mediaStyle} className="flex items-center justify-center bg-gray-100 text-gray-500">
            <p>Unsupported media type</p>
          </div>
        )}
      </div>
    )
  }

  const currentItem = items[currentIndex]

  useEffect(() => {
    if (isPlaying && timeRemaining > 0) {
      console.log("[v0] Timer running, time remaining:", timeRemaining)
      const timer = setTimeout(() => {
        console.log("[v0] Timer tick, new time:", timeRemaining - 1)
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (isPlaying && timeRemaining === 0) {
      console.log("[v0] Timer finished, calling goToNext")
      goToNext()
    }
  }, [isPlaying, timeRemaining, goToNext])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.code) {
        case "Space":
          e.preventDefault()
          isPlaying ? handlePause() : handlePlay()
          break
        case "ArrowRight":
          e.preventDefault()
          handleNext()
          break
        case "ArrowLeft":
          e.preventDefault()
          handlePrevious()
          break
        case "KeyF":
          e.preventDefault()
          toggleFullscreen()
          break
        case "Escape":
          if (isFullscreen) {
            setIsFullscreen(false)
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyPress)
    return () => document.removeEventListener("keydown", handleKeyPress)
  }, [isOpen, isPlaying, isFullscreen])

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, currentIndex])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [volume, playbackSpeed])

  if (!playlist) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none w-full h-full p-0 bg-black border-none"
        style={{ backgroundColor }} // Apply playlist-specific background color
      >
        <div className="absolute top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <h2 className="text-white font-semibold">{playlist?.name}</h2>
              <span className="text-white/70 text-sm">
                {items.length > 0 ? `${currentIndex + 1} of ${items.length} items` : "Loading..."}
              </span>
              {isPlaying && <span className="text-cyan-400 text-sm">● Auto-playing</span>}
            </div>

            <div className="flex items-center gap-2">
              {/* Playback Controls */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
              </button>

              <button
                onClick={goToPrevious}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>

              <button onClick={goToNext} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                <SkipForward className="w-5 h-5 text-white" />
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-white" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
                  className="w-16 h-1 bg-white/30 rounded-lg appearance-none slider"
                />
              </div>

              {/* Auto Loop */}
              <label className="flex items-center gap-2 text-white text-sm">
                <input
                  type="checkbox"
                  checked={autoLoop}
                  onChange={(e) => setAutoLoop(e.target.checked)}
                  className="rounded"
                />
                Loop
              </label>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>

              <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative bg-black overflow-hidden">{renderMedia()}</div>
      </DialogContent>
    </Dialog>
  )
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [playlistLimits, setPlaylistLimits] = useState<{
    maxPlaylists: number
    currentCount: number
    canCreate: boolean
  }>({
    maxPlaylists: -1,
    currentCount: 0,
    canCreate: true,
  })
  const [newPlaylist, setNewPlaylist] = useState({
    name: "",
    description: "",
    scale_image: "fit",
    scale_video: "fit",
    scale_document: "fit",
    shuffle: false,
    default_transition: "fade",
    background_color: "#000000", // Added background_color to newPlaylist state
  })
  const [creating, setCreating] = useState(false)
  const [previewPlaylist, setPreviewPlaylist] = useState<Playlist | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])
  const [availableMedia, setAvailableMedia] = useState<Media[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    duration_override: 10,
    start_time: 0,
    end_time: 0,
    notes: "",
    position: 1,
    transition_type: "fade" as "fade" | "slide-left" | "slide-right" | "cross-fade" | "zoom",
    transition_duration: 0.8,
  })
  const [updating, setUpdating] = useState(false)
  const [draggedItem, setDraggedItem] = useState<PlaylistItem | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const [transitionType, setTransitionType] = useState<"fade" | "slide-left" | "slide-right" | "cross-fade" | "zoom">(
    "fade",
  )
  const [transitionDuration, setTransitionDuration] = useState(0.8)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [autoLoop, setAutoLoop] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [volume, setVolume] = useState(1)
  const [timeRemaining, setTimeRemaining] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [playlistBackgroundColor, setPlaylistBackgroundColor] = useState(
    selectedPlaylist?.background_color || "#000000",
  )

  const { toast } = useToast()

  useEffect(() => {
    fetchPlaylists()
    fetchAvailableMedia()
    fetchPlaylistLimits()
  }, [])

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistItems(selectedPlaylist.id)
    }
  }, [selectedPlaylist])

  useEffect(() => {
    if (selectedPlaylist) {
      console.log(
        "[v0] Setting background color for playlist:",
        selectedPlaylist.name,
        selectedPlaylist.background_color,
      )
      setPlaylistBackgroundColor(selectedPlaylist.background_color || "#000000")
    }
  }, [selectedPlaylist])

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/playlists")
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.playlists)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch playlists",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching playlists:", error)
      toast({
        title: "Error",
        description: "Failed to fetch playlists",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPlaylistItems = async (playlistId?: string) => {
    // If playlistId is not provided, use the currently selected playlist
    const idToFetch = playlistId || selectedPlaylist?.id
    if (!idToFetch) return

    setLoadingItems(true)
    try {
      const response = await fetch(`/api/playlists/${idToFetch}`)
      if (response.ok) {
        const data = await response.json()
        const sortedItems =
          data.playlist.playlist_items?.sort((a: PlaylistItem, b: PlaylistItem) => a.position - b.position) || []
        setPlaylistItems(sortedItems)
      }
    } catch (error) {
      console.error("Error fetching playlist items:", error)
    } finally {
      setLoadingItems(false)
    }
  }

  const fetchAvailableMedia = async () => {
    setLoadingMedia(true)
    try {
      const response = await fetch("/api/media/list")
      if (response.ok) {
        const data = await response.json()
        setAvailableMedia(data.media || [])
      }
    } catch (error) {
      console.error("Error fetching media:", error)
    } finally {
      setLoadingMedia(false)
    }
  }

  const fetchPlaylistLimits = async () => {
    try {
      console.log("[v0] Fetching playlist limits...")
      const response = await fetch("/api/playlist-limits")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Playlist limits response:", data)
        setPlaylistLimits(data)
      } else {
        console.log("[v0] Playlist limits API failed, using defaults")
        // If no limits endpoint, allow unlimited creation
        setPlaylistLimits({
          maxPlaylists: -1,
          currentCount: playlists.length,
          canCreate: true,
        })
      }
    } catch (error) {
      console.error("Error fetching playlist limits:", error)
      // Default to allowing creation if limits can't be fetched
      setPlaylistLimits({
        maxPlaylists: -1,
        currentCount: playlists.length,
        canCreate: true,
      })
    }
  }

  const handleAddMediaToPlaylist = async (mediaId: string) => {
    if (!selectedPlaylist) return

    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_id: mediaId,
          duration: 10, // Default duration
        }),
      })

      if (response.ok) {
        fetchPlaylistItems() // Re-fetch items for the selected playlist
        toast({
          title: "Success",
          description: "Media added to playlist",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to add media to playlist",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding media:", error)
      toast({
        title: "Error",
        description: "Failed to add media to playlist",
        variant: "destructive",
      })
    }
  }

  const handleRemoveFromPlaylist = async (itemId: string) => {
    if (!selectedPlaylist) return

    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}/media`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_item_id: itemId,
        }),
      })

      if (response.ok) {
        fetchPlaylistItems() // Re-fetch items for the selected playlist
        toast({
          title: "Success",
          description: "Item removed from playlist",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to remove item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      })
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.name.trim()) return

    if (!playlistLimits.canCreate && playlistLimits.maxPlaylists !== -1) {
      toast({
        title: "Playlist Limit Reached",
        description: `You can only create ${playlistLimits.maxPlaylists} playlists with your current plan.`,
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPlaylist),
      })

      if (response.ok) {
        const data = await response.json()
        const newPlaylistData = { ...data.playlist, playlist_media: [{ count: 0 }] }
        setPlaylists((prev) => [newPlaylistData, ...prev])
        setNewPlaylist({
          name: "",
          description: "",
          scale_image: "fit",
          scale_video: "fit",
          scale_document: "fit",
          shuffle: false,
          default_transition: "fade",
          background_color: "#000000", // Reset background color
        })
        setShowCreateDialog(false)
        setSelectedPlaylist(newPlaylistData) // Select the newly created playlist
        setPlaylistLimits((prev) => ({
          ...prev,
          currentCount: prev.currentCount + 1,
          canCreate: prev.maxPlaylists === -1 || prev.currentCount + 1 < prev.maxPlaylists,
        }))
        toast({
          title: "Success",
          description: "Playlist created successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create playlist",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Create error:", error)
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePlaylist = async (id: string) => {
    try {
      const response = await fetch(`/api/playlists/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setPlaylists((prev) => prev.filter((playlist) => playlist.id !== id))
        if (selectedPlaylist?.id === id) {
          setSelectedPlaylist(null)
          setPlaylistItems([])
        }
        // Update playlist limits after successful deletion
        setPlaylistLimits((prev) => ({
          ...prev,
          currentCount: prev.currentCount - 1,
          canCreate: true, // Always allow creation after deletion, as the limit is now lower
        }))
        toast({
          title: "Success",
          description: "Playlist deleted successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete playlist",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete playlist",
        variant: "destructive",
      })
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem || !selectedPlaylist) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}/media`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlist_item_id: editingItem.id,
          duration_override: editForm.duration_override,
          start_time: editForm.start_time,
          end_time: editForm.end_time,
          notes: editForm.notes,
          transition_type: editForm.transition_type,
          transition_duration: editForm.transition_duration,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update item")
      }

      setPlaylistItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                duration_override: editForm.duration_override,
                start_time: editForm.start_time,
                end_time: editForm.end_time,
                notes: editForm.notes,
                transition_type: editForm.transition_type,
                transition_duration: editForm.transition_duration,
              }
            : item,
        ),
      )

      setShowEditDialog(false)
      setEditingItem(null)
      toast({ title: "Item updated successfully" })
    } catch (error) {
      console.error("Error updating item:", error)
      toast({ title: "Failed to update item", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, item: PlaylistItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (!draggedItem || !selectedPlaylist) return

    const currentItems = [...playlistItems]
    const draggedIndex = currentItems.findIndex((item) => item.id === draggedItem.id)

    if (draggedIndex === dropIndex) return

    // Remove dragged item and insert at new position
    const [removed] = currentItems.splice(draggedIndex, 1)
    currentItems.splice(dropIndex, 0, removed)

    // Update positions
    const updatedItems = currentItems.map((item, index) => ({
      ...item,
      position: index + 1,
    }))

    // Optimistic update
    setPlaylistItems(updatedItems)

    // Update positions in database
    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: updatedItems.map((item) => ({
            id: item.id,
            position: item.position,
          })),
        }),
      })

      if (!response.ok) {
        // Revert on error
        fetchPlaylistItems()
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to reorder items",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error reordering items:", error)
      fetchPlaylistItems()
      toast({
        title: "Error",
        description: "Failed to reorder items",
        variant: "destructive",
      })
    }

    setDraggedItem(null)
  }

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handlePreviewPlaylist = (playlist: Playlist) => {
    console.log("[v0] Opening preview for playlist:", playlist.name)
    setShowCreateDialog(false)
    setPreviewPlaylist(playlist)
  }

  const handleOpenCreateDialog = () => {
    console.log("[v0] Create button clicked, limits:", playlistLimits)

    if (playlistLimits.maxPlaylists > 0 && playlistLimits.currentCount >= playlistLimits.maxPlaylists) {
      toast({
        title: "Playlist Limit Reached",
        description: `You can only create ${playlistLimits.maxPlaylists} playlists with your current plan. Please upgrade to create more playlists.`,
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Opening create dialog...")
    setPreviewPlaylist(null)
    setShowCreateDialog(true)
  }

  const handleEditItem = (item: PlaylistItem) => {
    setEditingItem(item)
    setEditForm({
      name: item.media.name, // This should probably be editable, but for now it's just display
      duration_override: item.duration_override || 10,
      start_time: item.start_time || 0,
      end_time: item.end_time || 0,
      notes: item.notes || "",
      position: item.position,
      transition_type: (item as any).transition_type || "fade",
      transition_duration: (item as any).transition_duration || 0.8,
    })
    setShowEditDialog(true)
  }

  const [items, setItems] = useState<PlaylistItem[]>([]) // This seems to be a duplicate state, likely intended for PlaylistPreviewModal

  const goToNext = useCallback(() => {
    console.log("[v0] goToNext called, currentIndex:", currentIndex, "total items:", playlistItems.length)

    if (playlistItems.length === 0) {
      console.log("[v0] No items to advance to")
      return
    }

    if (currentIndex < playlistItems.length - 1) {
      const nextItem = playlistItems[currentIndex + 1]
      const transitionType = nextItem?.transition_type || "fade"
      const transitionDuration = nextItem?.transition_duration || 0.8

      console.log(
        "[v0] Applying transition:",
        transitionType,
        "duration:",
        transitionDuration,
        "for item:",
        nextItem.media?.name,
      )

      setIsTransitioning(true)
      setTimeout(() => {
        console.log("[v0] Transition complete, moving to next item")
        setCurrentIndex((prev) => prev + 1)
        setTimeRemaining(playlistItems[currentIndex + 1]?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    } else if (autoLoop) {
      const firstItem = playlistItems[0]
      const transitionType = firstItem?.transition_type || "fade"
      const transitionDuration = firstItem?.transition_duration || 0.8

      console.log("[v0] Loop transition:", transitionType, "duration:", transitionDuration)

      setIsTransitioning(true)
      setTimeout(() => {
        console.log("[v0] Loop transition complete, back to first item")
        setCurrentIndex(0)
        setTimeRemaining(playlistItems[0]?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    } else {
      console.log("[v0] Playlist finished, stopping playback")
      setIsPlaying(false)
    }
  }, [autoLoop, currentIndex, playlistItems, setIsPlaying, setIsTransitioning, setTimeRemaining])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const previousItem = playlistItems[currentIndex - 1]
      const transitionType = previousItem?.transition_type || "fade"
      const transitionDuration = previousItem?.transition_duration || 0.8

      console.log("[v0] Previous transition:", transitionType, "duration:", transitionDuration)

      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1)
        setTimeRemaining(playlistItems[currentIndex - 1]?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    } else if (autoLoop && playlistItems.length > 0) {
      // Added check for playlistItems.length > 0
      const lastIndex = playlistItems.length - 1
      const lastItem = playlistItems[lastIndex]
      const transitionType = lastItem?.transition_type || "fade"
      const transitionDuration = lastItem?.transition_duration || 0.8

      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(lastIndex)
        setTimeRemaining(lastItem?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    }
  }, [autoLoop, currentIndex, playlistItems, setIsTransitioning, setTimeRemaining])

  const renderMedia = () => {
    if (!playlistItems.length || currentIndex >= playlistItems.length) return null

    const item = playlistItems[currentIndex]
    const transitionType = item.transition_type || "fade"
    const transitionDuration = item.transition_duration || 0.8

    console.log("[v0] Rendering item with transition:", transitionType, "transitioning:", isTransitioning)

    const isImage = item.media.mime_type?.startsWith("image/")
    const isVideo = item.media.mime_type?.startsWith("video/")
    const isGoogleSlides = item.media.file_path?.includes("docs.google.com/presentation")

    const getTransitionStyle = () => {
      const baseStyle = {
        transitionProperty: "opacity, transform", // Specify properties to transition
        transitionDuration: `${transitionDuration}s`,
        transitionTimingFunction: "ease-in-out",
      }

      if (isTransitioning) {
        switch (transitionType) {
          case "fade":
            return { ...baseStyle, opacity: 0 }
          case "slide-left":
            return { ...baseStyle, transform: "translateX(-100%)", opacity: 1 } // Keep opacity 1 for slide
          case "slide-right":
            return { ...baseStyle, transform: "translateX(100%)", opacity: 1 } // Keep opacity 1 for slide
          case "cross-fade":
            return { ...baseStyle, opacity: 0, transform: "scale(0.95)" }
          case "zoom":
            return { ...baseStyle, opacity: 0, transform: "scale(1.1)" }
          default:
            return { ...baseStyle, opacity: 0 }
        }
      }

      return { ...baseStyle, opacity: 1, transform: "translateX(0) scale(1)" }
    }

    return (
      <div className="relative w-full h-full overflow-hidden bg-black rounded-lg">
        <div className="w-full h-full transition-all" style={getTransitionStyle()}>
          {isImage && (
            <img
              src={item.media.file_path || "/placeholder.svg"}
              alt={item.media.name}
              className="w-full h-full object-contain"
            />
          )}
          {isVideo && (
            <video
              ref={videoRef}
              src={item.media.file_path}
              className="w-full h-full object-contain"
              controls={false}
              autoPlay
              muted={volume === 0}
              onEnded={goToNext}
              style={{ playbackRate: playbackSpeed }}
            />
          )}
          {isGoogleSlides && (
            <iframe
              src={item.media.file_path?.replace("/edit", "/embed")}
              className="w-full h-full border-0"
              allowFullScreen
            />
          )}
        </div>

        {/* This part seems to be for visual feedback during cross-fade, might need adjustment */}
        {transitionType === "cross-fade" && isTransitioning && (
          <div className="absolute inset-0 bg-black/20 transition-opacity duration-500" />
        )}
      </div>
    )
  }

  const togglePlayPause = () => {
    if (playlistItems.length === 0) return
    setIsPlaying(!isPlaying)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  const handleUpdatePlaylistBackground = async (backgroundColor: string) => {
    if (!selectedPlaylist) return

    try {
      console.log("[v0] Updating background color for playlist:", selectedPlaylist.name, "to:", backgroundColor)
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background_color: backgroundColor }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update background color")
      }

      const { playlist } = await response.json()
      console.log("[v0] Background color updated successfully:", playlist.background_color)

      setPlaylists((prev) =>
        prev.map((p) => (p.id === selectedPlaylist.id ? { ...p, background_color: backgroundColor } : p)),
      )

      // Update selectedPlaylist to reflect the change
      if (selectedPlaylist.id === playlist.id) {
        setSelectedPlaylist({ ...selectedPlaylist, background_color: backgroundColor })
      }
    } catch (error) {
      console.error("Error updating background color:", error)
      toast({ title: "Failed to update background color", variant: "destructive" })
    }
  }

  const handleUpdatePlaylistSettings = async (
    settings: Partial<{
      scale_image: string
      scale_video: string
      scale_document: string
      shuffle: boolean
      default_transition: string
    }>,
  ) => {
    if (!selectedPlaylist) return

    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update playlist settings")
      }

      const { playlist } = await response.json()

      setPlaylists((prev) => prev.map((p) => (p.id === selectedPlaylist.id ? { ...p, ...settings } : p)))

      setSelectedPlaylist({ ...selectedPlaylist, ...settings })
      toast({ title: "Playlist settings updated successfully" })
    } catch (error) {
      console.error("Error updating playlist settings:", error)
      toast({
        title: "Error",
        description: "Failed to update playlist settings",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex h-full gap-6">
      <div className="w-80 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Playlists</h1>
          <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>

        {playlistLimits.maxPlaylists > 0 && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span>Playlists:</span>
              <span className={playlistLimits.canCreate ? "text-green-600" : "text-red-600"}>
                {playlistLimits.currentCount} / {playlistLimits.maxPlaylists}
              </span>
            </div>
            {!playlistLimits.canCreate && (
              <p className="text-xs text-red-600 mt-1">Upgrade your plan to create more playlists</p>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search playlists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
          {filteredPlaylists.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <PlayCircle className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  {playlists.length === 0 ? "No playlists yet" : "No playlists match your search"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPlaylists.map((playlist) => (
              <Card
                key={playlist.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedPlaylist?.id === playlist.id ? "ring-2 ring-cyan-500 bg-cyan-50" : ""
                }`}
                onClick={() => setSelectedPlaylist(playlist)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" title={playlist.name}>
                        {playlist.name}
                      </h3>
                      {playlist.description && (
                        <p className="text-sm mt-1 line-clamp-2 text-primary">{playlist.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <span>{playlist.playlist_media?.[0]?.count || 0} items</span>
                        <span>{new Date(playlist.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreviewPlaylist(playlist)
                        }}
                        className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePlaylist(playlist.id)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="flex-1">
        {selectedPlaylist ? (
          <div className="h-full">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedPlaylist.name}</h2>
              {selectedPlaylist.description && <p className="text-gray-600 mt-1">{selectedPlaylist.description}</p>}
            </div>

            <Tabs defaultValue="content" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Available Media</h3>
                  {loadingMedia ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
                    </div>
                  ) : availableMedia.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <PlayCircle className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 text-center">No media found.</p>
                        <p className="text-xs text-gray-500 mt-1">Upload some media to get started.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                      {availableMedia.map((media) => (
                        <Card key={media.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center">
                              {media.mime_type?.startsWith("image/") ? (
                                <img
                                  src={media.file_path || "/placeholder.svg"}
                                  alt={media.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : media.mime_type?.startsWith("video/") ? (
                                <Video className="h-8 w-8 text-gray-400" />
                              ) : (
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                              )}
                            </div>
                            <p className="text-sm font-medium truncate" title={media.name}>
                              {media.name}
                            </p>
                            <Button
                              size="sm"
                              className="w-full mt-2 bg-cyan-500 hover:bg-cyan-600"
                              onClick={() => handleAddMediaToPlaylist(media.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Playlist Items</h3>
                  {loadingItems ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
                    </div>
                  ) : playlistItems.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <PlayCircle className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">No items in this playlist</p>
                        <p className="text-xs text-gray-500 mt-1">Add media from the available media above</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {playlistItems.map((item, index) => (
                        <Card
                          key={item.id}
                          className={`transition-all duration-200 ${
                            dragOverIndex === index ? "border-blue-500 bg-blue-50" : ""
                          } ${draggedItem?.id === item.id ? "opacity-50" : ""}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="cursor-move text-gray-400 hover:text-gray-600">
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-medium w-6 text-primary">{item.position}</span>
                              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                {item.media.mime_type?.startsWith("image/") ? (
                                  <img
                                    src={item.media.file_path || "/placeholder.svg"}
                                    alt={item.media.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : item.media.mime_type?.startsWith("video/") ? (
                                  <Video className="h-6 w-6 text-gray-400" />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-primary">{item.media.name}</p>
                                <p className="text-sm font-medium w-6 text-primary">
                                  Duration: {item.duration_override}s
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="text-sm font-medium w-6 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFromPlaylist(item.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Playlist Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input value={selectedPlaylist.name} readOnly />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={selectedPlaylist.description || ""} readOnly />
                      </div>
                      <div>
                        <Label>Created</Label>
                        <Input value={new Date(selectedPlaylist.created_at).toLocaleString()} readOnly />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Appearance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="background-color">Background Color</Label>
                        <div className="flex items-center gap-3 mt-2">
                          <input
                            id="background-color"
                            type="color"
                            value={playlistBackgroundColor}
                            onChange={(e) => {
                              setPlaylistBackgroundColor(e.target.value)
                              handleUpdatePlaylistBackground(e.target.value)
                            }}
                            className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <Input
                            value={playlistBackgroundColor}
                            onChange={(e) => {
                              setPlaylistBackgroundColor(e.target.value)
                              handleUpdatePlaylistBackground(e.target.value)
                            }}
                            placeholder="#000000"
                            className="font-mono text-sm"
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Choose the background color for playlist preview</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Media Scaling</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="scale-image">Scale Image</Label>
                        <select
                          id="scale-image"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          value={selectedPlaylist ? selectedPlaylist.scale_image || "fit" : newPlaylist.scale_image}
                          onChange={(e) => {
                            if (selectedPlaylist) {
                              handleUpdatePlaylistSettings({ scale_image: e.target.value })
                            } else {
                              setNewPlaylist((prev) => ({ ...prev, scale_image: e.target.value }))
                            }
                          }}
                        >
                          <option value="fit">Fit</option>
                          <option value="fill">Fill</option>
                          <option value="stretch">Stretch</option>
                          <option value="center">Center</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="scale-video">Scale Video</Label>
                        <select
                          id="scale-video"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          value={selectedPlaylist ? selectedPlaylist.scale_video || "fit" : newPlaylist.scale_video}
                          onChange={(e) => {
                            if (selectedPlaylist) {
                              handleUpdatePlaylistSettings({ scale_video: e.target.value })
                            } else {
                              setNewPlaylist((prev) => ({ ...prev, scale_video: e.target.value }))
                            }
                          }}
                        >
                          <option value="fit">Fit</option>
                          <option value="fill">Fill</option>
                          <option value="stretch">Stretch</option>
                          <option value="center">Center</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="scale-document">Scale Document</Label>
                        <select
                          id="scale-document"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          value={
                            selectedPlaylist ? selectedPlaylist.scale_document || "fit" : newPlaylist.scale_document
                          }
                          onChange={(e) => {
                            if (selectedPlaylist) {
                              handleUpdatePlaylistSettings({ scale_document: e.target.value })
                            } else {
                              setNewPlaylist((prev) => ({ ...prev, scale_document: e.target.value }))
                            }
                          }}
                        >
                          <option value="fit">Fit</option>
                          <option value="fill">Fill</option>
                          <option value="stretch">Stretch</option>
                          <option value="center">Center</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Playback Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="shuffle">Shuffle</Label>
                          <p className="text-sm text-gray-500">Randomize playlist order</p>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="shuffle"
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            checked={selectedPlaylist ? selectedPlaylist.shuffle || false : newPlaylist.shuffle}
                            onChange={(e) => {
                              if (selectedPlaylist) {
                                handleUpdatePlaylistSettings({ shuffle: e.target.checked })
                              } else {
                                setNewPlaylist((prev) => ({ ...prev, shuffle: e.target.checked }))
                              }
                            }}
                          />
                          <label htmlFor="shuffle" className="ml-2 text-sm font-medium text-gray-900">
                            {(selectedPlaylist ? selectedPlaylist.shuffle || false : newPlaylist.shuffle)
                              ? "ON"
                              : "OFF"}
                          </label>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="default-transition">Default Transition</Label>
                        <select
                          id="default-transition"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          value={
                            selectedPlaylist
                              ? selectedPlaylist.default_transition || "fade"
                              : newPlaylist.default_transition
                          }
                          onChange={(e) => {
                            if (selectedPlaylist) {
                              handleUpdatePlaylistSettings({ default_transition: e.target.value })
                            } else {
                              setNewPlaylist((prev) => ({ ...prev, default_transition: e.target.value }))
                            }
                          }}
                        >
                          <option value="fade">Fade</option>
                          <option value="slide-left">Slide Left</option>
                          <option value="slide-right">Slide Right</option>
                          <option value="cross-fade">Cross Fade</option>
                          <option value="zoom">Zoom</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Card className="h-full">
            <CardContent className="flex flex-col items-center justify-center h-full">
              <PlayCircle className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Playlist</h3>
              <p className="text-gray-600 text-center">
                Choose a playlist from the left panel to view and manage its content
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ADDED: Create Playlist Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>Create a new playlist to organize your media content</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="playlist-name">Playlist Name</Label>
                <Input
                  id="playlist-name"
                  value={newPlaylist.name}
                  onChange={(e) => setNewPlaylist((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter playlist name"
                />
              </div>

              <div>
                <Label htmlFor="playlist-description">Description (Optional)</Label>
                <Textarea
                  id="playlist-description"
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter playlist description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="background-color">Background Color</Label>
                <Input
                  id="background-color"
                  type="color"
                  value={newPlaylist.background_color}
                  onChange={(e) => setNewPlaylist((prev) => ({ ...prev, background_color: e.target.value }))}
                  className="w-full h-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t shrink-0 bg-gray-50/50">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              disabled={creating || !newPlaylist.name.trim()}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              {creating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : null}
              Create Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>Edit Playlist Item</DialogTitle>
            <DialogDescription>Modify the settings for this playlist item</DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="flex-1 overflow-y-auto p-6 pt-4 scrollbar-hide">
              <div className="space-y-4">
                {/* Media Preview */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                    {editingItem.media.mime_type?.startsWith("image/") ? (
                      <img
                        src={editingItem.media.file_path || "/placeholder.svg"}
                        alt={editingItem.media.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : editingItem.media.mime_type?.startsWith("video/") ? (
                      <Video className="h-6 w-6 text-gray-400" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{editingItem.media.name}</p>
                    <p className="text-sm text-gray-500">{editingItem.media.mime_type}</p>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <Label htmlFor="item-name">Display Name</Label>
                  <Input
                    id="item-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Item display name"
                  />
                </div>

                {/* Duration */}
                <div>
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="3600"
                    value={editForm.duration_override}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, duration_override: Number.parseInt(e.target.value) || 10 }))
                    }
                  />
                  <p className="text-xs mt-1 text-gray-500">How long this item should display in the playlist</p>
                </div>

                {/* Position */}
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    type="number"
                    min="1"
                    value={editForm.position}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, position: Number.parseInt(e.target.value) || 1 }))
                    }
                  />
                  <p className="text-xs mt-1 text-gray-500">Order position in the playlist</p>
                </div>

                {/* Video Clip Settings (for videos) */}
                {editingItem.media.mime_type?.startsWith("video/") && (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-base font-semibold">Video Clip Settings</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="start-time" className="text-sm">
                          Start Time (s)
                        </Label>
                        <Input
                          id="start-time"
                          type="number"
                          min="0"
                          value={editForm.start_time}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, start_time: Number.parseInt(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-time" className="text-sm">
                          End Time (s)
                        </Label>
                        <Input
                          id="end-time"
                          type="number"
                          min="0"
                          value={editForm.end_time}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, end_time: Number.parseInt(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Set start/end times to show only a portion of the video</p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes or description for this item"
                    rows={3}
                  />
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label className="text-base font-semibold">Transition Settings</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="transition-type" className="text-sm">
                        Transition Type
                      </Label>
                      <select
                        id="transition-type"
                        value={editForm.transition_type}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, transition_type: e.target.value as any }))}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="fade">Fade</option>
                        <option value="slide-left">Slide Left</option>
                        <option value="slide-right">Slide Right</option>
                        <option value="cross-fade">Cross Fade</option>
                        <option value="zoom">Zoom</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="transition-duration" className="text-sm">
                        Duration (seconds)
                      </Label>
                      <input
                        id="transition-duration"
                        type="number"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={editForm.transition_duration}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            transition_duration: Number.parseFloat(e.target.value) || 0.8,
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Set how this item transitions when it appears in the playlist</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-6 pt-4 border-t shrink-0 bg-gray-50/50">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={updating} className="bg-cyan-500 hover:bg-cyan-600">
              {updating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : null}
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewPlaylist && (
        <PlaylistPreviewModal
          playlist={previewPlaylist}
          isOpen={!!previewPlaylist}
          onClose={() => setPreviewPlaylist(null)}
          backgroundColor={previewPlaylist.background_color || "#000000"}
        />
      )}
    </div>
  )
}
