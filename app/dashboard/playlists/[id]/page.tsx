"use client"

import { DialogDescription } from "@/components/ui/dialog"

import { DialogTitle } from "@/components/ui/dialog"

import { DialogHeader } from "@/components/ui/dialog"

import { DialogContent } from "@/components/ui/dialog"

import { Dialog } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Plus, Trash2, Clock, ImageIcon, Video, GripVertical, Edit, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface MediaItem {
  id: string
  name: string
  mime_type: string
  file_size: number
  file_path: string
  tags: string[]
}

interface PlaylistMediaItem {
  id: string
  duration_override: number
  position: number
  media: MediaItem
}

interface Playlist {
  id: string
  name: string
  description: string
  playlist_items: PlaylistMediaItem[]
}

function SortableItem({
  item,
  index,
  onEdit,
  onDelete,
  formatFileSize,
  getMediaDisplayName,
}: {
  item: PlaylistMediaItem
  index: number
  onEdit: (item: PlaylistMediaItem) => void
  onDelete: (id: string) => void
  formatFileSize: (bytes: number) => string
  getMediaDisplayName: (media: MediaItem) => string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!item?.media) return null

  const renderThumbnail = (media: MediaItem) => {
    if (media.mime_type?.startsWith("image/")) {
      return (
        <img
          src={media.file_path || "/placeholder.svg"}
          alt={media.name || "Media"}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/abstract-colorful-swirls.png"
          }}
        />
      )
    } else if (media.mime_type?.startsWith("video/")) {
      return (
        <video
          src={media.file_path}
          className="w-full h-full object-cover"
          muted
          preload="metadata"
          onError={() => {
            // Fallback to icon if video fails to load
          }}
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement
            video.currentTime = 1 // Seek to 1 second for thumbnail
          }}
        />
      )
    } else if (media.mime_type === "application/vnd.google-apps.presentation") {
      return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-1 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            <span className="text-xs text-blue-600 font-medium">Slides</span>
          </div>
        </div>
      )
    } else {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <Video className="h-6 w-6 text-gray-400" />
        </div>
      )
    }
  }

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? "z-50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 text-gray-400 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
            <span className="text-sm font-medium">{index + 1}</span>
          </div>
          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {renderThumbnail(item.media)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate" title={getMediaDisplayName(item.media)}>
              {getMediaDisplayName(item.media)}
            </h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>{formatFileSize(item.media.file_size || 0)}</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{item.duration_override || 10}s</span>
              </div>
            </div>
            {(item.media.tags?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(item.media.tags || []).slice(0, 3).map((tag, tagIndex) => (
                  <Badge key={tagIndex} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {(item.media.tags?.length || 0) > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{(item.media.tags?.length || 0) - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PlaylistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMedia, setSelectedMedia] = useState<string>("")
  const [duration, setDuration] = useState(10)
  const [editingPlaylistName, setEditingPlaylistName] = useState("")
  const [editingPlaylistDescription, setEditingPlaylistDescription] = useState("")
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    if (params.id) {
      fetchPlaylist()
      fetchAvailableMedia()
    }
  }, [params.id])

  useEffect(() => {
    if (playlist) {
      setEditingPlaylistName(playlist.name)
      setEditingPlaylistDescription(playlist.description || "")
    }
  }, [playlist])

  const fetchPlaylist = async () => {
    try {
      console.log("[v0] Fetching playlist for ID:", params.id)
      const response = await fetch(`/api/playlists/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Playlist data received:", data)
        if (data.playlist?.playlist_items) {
          console.log("[v0] Playlist items count:", data.playlist.playlist_items.length)
          data.playlist.playlist_items.forEach((item, index) => {
            console.log(`[v0] Item ${index}:`, {
              id: item.id,
              media: item.media,
              mediaName: item.media?.name,
              mediaMimeType: item.media?.mime_type,
              mediaFileSize: item.media?.file_size,
            })
          })
        }
        setPlaylist(data.playlist)
      } else {
        console.log("[v0] Playlist fetch failed with status:", response.status)
        toast({
          title: "Error",
          description: "Failed to fetch playlist",
          variant: "destructive",
        })
        router.push("/dashboard/playlists")
      }
    } catch (error) {
      console.error("Error fetching playlist:", error)
      toast({
        title: "Error",
        description: "Failed to fetch playlist",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableMedia = async () => {
    try {
      console.log("[v0] Fetching available media")
      const response = await fetch("/api/media/list")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Available media received:", data)
        if (data.media) {
          console.log("[v0] Available media count:", data.media.length)
          data.media.slice(0, 3).forEach((media, index) => {
            console.log(`[v0] Media ${index}:`, {
              id: media.id,
              name: media.name,
              mime_type: media.mime_type,
              file_size: media.file_size,
            })
          })
        }
        setAvailableMedia(data.media || [])
      } else {
        console.log("[v0] Media fetch failed with status:", response.status)
      }
    } catch (error) {
      console.error("Error fetching media:", error)
    }
  }

  const handleAddMedia = async () => {
    if (!selectedMedia) return

    try {
      const response = await fetch(`/api/playlists/${params.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_id: selectedMedia,
          duration,
        }),
      })

      if (response.ok) {
        await fetchPlaylist()
        setSelectedMedia("")
        setDuration(10)
        toast({
          title: "Success",
          description: "Media added to playlist",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to add media",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Add media error:", error)
      toast({
        title: "Error",
        description: "Failed to add media",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePlaylist = async () => {
    try {
      const response = await fetch(`/api/playlists/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingPlaylistName,
          description: editingPlaylistDescription,
        }),
      })

      if (response.ok) {
        await fetchPlaylist()
        toast({
          title: "Success",
          description: "Playlist updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update playlist",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Update playlist error:", error)
      toast({
        title: "Error",
        description: "Failed to update playlist",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMedia = async (playlistItemId: string) => {
    try {
      const response = await fetch(`/api/playlists/${params.id}/media`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_item_id: playlistItemId,
        }),
      })

      if (response.ok) {
        await fetchPlaylist()
        toast({
          title: "Success",
          description: "Media removed from playlist",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to remove media",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete media error:", error)
      toast({
        title: "Error",
        description: "Failed to remove media",
        variant: "destructive",
      })
    }
  }

  const handleEditDuration = async () => {
    // Existing code for handleEditDuration
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getTotalDuration = () => {
    if (!playlist?.playlist_items) return 0
    return playlist.playlist_items.reduce((total, item) => {
      return total + (item?.duration_override || 10)
    }, 0)
  }

  const getMediaDisplayName = (media: MediaItem) => {
    if (media.name && media.name.trim()) {
      return media.name
    }
    if (media.mime_type) {
      const extension = media.mime_type.split("/")[1] || "file"
      return `Untitled.${extension}`
    }
    return "Untitled"
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    // Existing code for handleDragEnd
  }

  const renderMediaThumbnail = (media: MediaItem) => {
    if (media.mime_type?.startsWith("image/")) {
      return (
        <img
          src={media.file_path || "/placeholder.svg"}
          alt={media.name || "Media"}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/abstract-colorful-swirls.png"
          }}
        />
      )
    } else if (media.mime_type?.startsWith("video/")) {
      return (
        <video
          src={media.file_path}
          className="w-full h-full object-cover"
          muted
          preload="metadata"
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement
            video.currentTime = 1 // Seek to 1 second for thumbnail
          }}
        />
      )
    } else if (media.mime_type === "application/vnd.google-apps.presentation") {
      return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">G</span>
            </div>
            <span className="text-sm text-blue-600 font-medium">Google Slides</span>
          </div>
        </div>
      )
    } else {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <Video className="h-8 w-8 text-gray-400" />
        </div>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Playlist not found</h2>
        <Button onClick={() => router.push("/dashboard/playlists")} className="mt-4">
          Back to Playlists
        </Button>
      </div>
    )
  }

  const playlistItems = playlist.playlist_items || []

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/playlists")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Playlists
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">{playlist.name}</h1>
          {playlist.description && <p className="text-gray-600 mt-1">{playlist.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" />
              <span>{playlistItems.length} items</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{getTotalDuration()} seconds total</span>
            </div>
          </div>
        </div>

        {playlistItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No media in playlist</h3>
              <p className="text-gray-600 text-center mb-4">
                Add media from your library using the Content tab on the right
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={playlistItems.sort((a, b) => (a?.position || 0) - (b?.position || 0)).map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {playlistItems
                  .sort((a, b) => (a?.position || 0) - (b?.position || 0))
                  .map((item, index) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      index={index}
                      onEdit={() => {}}
                      onDelete={handleDeleteMedia}
                      formatFileSize={formatFileSize}
                      getMediaDisplayName={getMediaDisplayName}
                    />
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="w-80 border-l border-gray-200 pl-6">
        <Tabs defaultValue="content" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-6 space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="duration">Display Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="300"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>

              <div>
                <Label>Available Media</Label>
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto mt-2">
                  {(availableMedia || []).map((media) => (
                    <Card
                      key={media.id}
                      className={`cursor-pointer transition-colors ${
                        selectedMedia === media.id ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedMedia(media.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {renderMediaThumbnail(media)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate" title={getMediaDisplayName(media)}>
                              {getMediaDisplayName(media)}
                            </h4>
                            <p className="text-xs text-gray-600">{formatFileSize(media.file_size || 0)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleAddMedia}
                disabled={!selectedMedia}
                className="w-full bg-cyan-500 hover:bg-cyan-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Playlist
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="playlist-name">Playlist Name</Label>
                <Input
                  id="playlist-name"
                  value={editingPlaylistName}
                  onChange={(e) => setEditingPlaylistName(e.target.value)}
                  placeholder="Enter playlist name"
                />
              </div>

              <div>
                <Label htmlFor="playlist-description">Description</Label>
                <Textarea
                  id="playlist-description"
                  value={editingPlaylistDescription}
                  onChange={(e) => setEditingPlaylistDescription(e.target.value)}
                  placeholder="Enter playlist description"
                  rows={3}
                />
              </div>

              <Button onClick={handleUpdatePlaylist} className="w-full" disabled={!editingPlaylistName.trim()}>
                <Settings className="h-4 w-4 mr-2" />
                Update Playlist
              </Button>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Playlist Statistics</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Items:</span>
                    <span>{playlistItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Duration:</span>
                    <span>{getTotalDuration()}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Duration:</span>
                    <span>{playlistItems.length > 0 ? Math.round(getTotalDuration() / playlistItems.length) : 0}s</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Duration</DialogTitle>
            <DialogDescription>
              Set the display duration for "
              {playlistItems.length > 0 ? getMediaDisplayName(playlistItems[0].media) : ""}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-duration">Display Duration (seconds)</Label>
              <Input id="edit-duration" type="number" min="1" max="300" value={10} onChange={() => {}} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {}}>
              Cancel
            </Button>
            <Button onClick={() => {}}>Update Duration</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
