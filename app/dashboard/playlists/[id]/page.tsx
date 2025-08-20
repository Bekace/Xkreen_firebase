"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Clock, ImageIcon, Video, GripVertical } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MediaItem {
  id: string
  filename: string
  file_type: string
  file_size: number
  blob_url: string
  tags: string[]
}

interface PlaylistMediaItem {
  id: string
  duration: number
  order_index: number
  media: MediaItem
}

interface Playlist {
  id: string
  name: string
  description: string
  playlist_media: PlaylistMediaItem[]
}

export default function PlaylistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMediaDialog, setShowAddMediaDialog] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<string>("")
  const [duration, setDuration] = useState(10)
  const { toast } = useToast()

  useEffect(() => {
    if (params.id) {
      fetchPlaylist()
      fetchAvailableMedia()
    }
  }, [params.id])

  const fetchPlaylist = async () => {
    try {
      const response = await fetch(`/api/playlists/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setPlaylist(data.playlist)
      } else {
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
      const response = await fetch("/api/media/list")
      if (response.ok) {
        const data = await response.json()
        setAvailableMedia(data.media)
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
        const data = await response.json()
        setPlaylist((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            playlist_media: [...prev.playlist_media, data.playlistMedia],
          }
        })
        setSelectedMedia("")
        setDuration(10)
        setShowAddMediaDialog(false)
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getTotalDuration = () => {
    if (!playlist) return 0
    return playlist.playlist_media.reduce((total, item) => total + item.duration, 0)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/playlists")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Playlists
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{playlist.name}</h1>
          {playlist.description && <p className="text-gray-600 mt-1">{playlist.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" />
              <span>{playlist.playlist_media.length} items</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{getTotalDuration()} seconds total</span>
            </div>
          </div>
        </div>
        <Dialog open={showAddMediaDialog} onOpenChange={setShowAddMediaDialog}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Media
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Media to Playlist</DialogTitle>
              <DialogDescription>Select media from your library to add to this playlist.</DialogDescription>
            </DialogHeader>
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
                <Label>Select Media</Label>
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto mt-2">
                  {availableMedia.map((media) => (
                    <Card
                      key={media.id}
                      className={`cursor-pointer transition-colors ${
                        selectedMedia === media.id ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedMedia(media.id)}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2">
                          {media.file_type.startsWith("image/") ? (
                            <img
                              src={media.blob_url || "/placeholder.svg"}
                              alt={media.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Video className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-sm truncate" title={media.filename}>
                          {media.filename}
                        </h4>
                        <p className="text-xs text-gray-600">{formatFileSize(media.file_size)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddMediaDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMedia} disabled={!selectedMedia}>
                Add to Playlist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Playlist Items */}
      {playlist.playlist_media.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No media in playlist</h3>
            <p className="text-gray-600 text-center mb-4">
              Add media from your library to start building this playlist
            </p>
            <Button onClick={() => setShowAddMediaDialog(true)} className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Media
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {playlist.playlist_media
            .sort((a, b) => a.order_index - b.order_index)
            .map((item, index) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.media.file_type.startsWith("image/") ? (
                        <img
                          src={item.media.blob_url || "/placeholder.svg"}
                          alt={item.media.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Video className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.media.filename}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{formatFileSize(item.media.file_size)}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{item.duration}s</span>
                        </div>
                      </div>
                      {item.media.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.media.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.media.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.media.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
