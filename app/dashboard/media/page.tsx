"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Search, Grid, List, Trash2, Plus, ImageIcon, Video, Eye, LinkIcon, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog"
import { useUploadLimits } from "@/hooks/use-upload-limits"
import { StorageUsageBar } from "@/components/ui/storage-usage-bar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { SmartFileUploader } from "@/components/media/smart-file-uploader"
import { SimpleUploader } from "@/components/media/simple-uploader"

interface MediaItem {
  id: string
  name: string
  mime_type: string
  file_size: number
  file_path: string
  thumbnail_path?: string
  tags: string[] | null
  created_at: string
}

function MediaPreviewModal({
  media,
  isOpen,
  onClose,
}: {
  media: MediaItem | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!media) return null

  const getGoogleSlidesEmbedUrl = (url: string) => {
    // Handle various Google Slides URL formats
    const patterns = [
      /https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)\/edit/,
      /https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`
      }
    }

    // If already an embed URL, return as is
    if (url.includes("/embed")) {
      return url
    }

    return url
  }

  const isGoogleSlides = (media: MediaItem) => {
    return (
      media.file_path?.includes("docs.google.com/presentation") ||
      media.mime_type?.includes("presentation") ||
      media.name?.toLowerCase().includes("slides")
    )
  }

  const isYouTubeVideo = (media: MediaItem) => {
    return (
      media.mime_type === "video/youtube" ||
      media.file_path?.includes("youtube.com/embed") ||
      media.file_path?.includes("youtube-nocookie.com/embed")
    )
  }

  // Helper function to ensure YouTube videos autoplay
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
    } catch (error) {
      console.error("Error parsing YouTube URL:", error)
      return url
    }
  }

  const renderMedia = () => {
    if (media.mime_type?.startsWith("image/")) {
      return (
        <img src={media.file_path || "/placeholder.svg"} alt={media.name} className="w-full h-full object-contain" />
      )
    }

    if (isYouTubeVideo(media)) {
      const autoplayUrl = getYouTubeUrlWithAutoplay(media.file_path)
      return (
        <iframe
          key={media.id}
          src={autoplayUrl}
          className="w-full h-full border-0"
          allowFullScreen
          title={media.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )
    }

    if (media.mime_type?.startsWith("video/")) {
      return <video src={media.file_path} className="w-full h-full object-contain" controls playsInline />
    }

    if (isGoogleSlides(media)) {
      const embedUrl = getGoogleSlidesEmbedUrl(media.file_path || "")
      return <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen title={media.name} />
    }

    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Preview not available for this file type</p>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full p-0 m-0" style={{ width: "100vw", height: "100vh" }}>
        <DialogTitle className="sr-only">{media.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Preview of {media.mime_type} file, {formatFileSize(media.file_size)}, created on{" "}
          {new Date(media.created_at).toLocaleDateString()}
        </DialogDescription>

        <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{media.name}</h2>
              <div className="flex items-center gap-4 text-sm text-white/80 mt-1">
                <span>{media.mime_type}</span>
                <span>{formatFileSize(media.file_size)}</span>
                <span>Created: {new Date(media.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              {media.tags && media.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {media.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                      {tag}
                    </Badge>
                  ))}
                  {media.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                      +{media.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 border border-white/30"
              >
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full h-full bg-black flex items-center justify-center pt-20">{renderMedia()}</div>
      </DialogContent>
    </Dialog>
  )
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tags, setTags] = useState("")
  const [importUrl, setImportUrl] = useState("")
  const [importName, setImportName] = useState("")
  const [importTags, setImportTags] = useState("")
  const [importing, setImporting] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    itemId: string
    itemName: string
  }>({
    open: false,
    itemId: "",
    itemName: "",
  })
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null)
  const [editDialog, setEditDialog] = useState<{
    open: boolean
    item: MediaItem | null
  }>({
    open: false,
    item: null,
  })
  const [editName, setEditName] = useState("")
  const [editTags, setEditTags] = useState("")
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()
  const uploadLimits = useUploadLimits()

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    try {
      const response = await fetch("/api/media/list")

      if (response.ok) {
        const data = await response.json()
        setMedia(Array.isArray(data.media) ? data.media : [])
      } else if (response.status === 401) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access the media library",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch media",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching media:", error)
      toast({
        title: "Error",
        description: "Failed to fetch media",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > uploadLimits.maxFileSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
        const maxSizeMB = Math.round(uploadLimits.maxFileSize / (1024 * 1024))
        toast({
          title: "File Too Large",
          description: `This file (${fileSizeMB} MB) exceeds the maximum file size of ${maxSizeMB} MB for your ${uploadLimits.planName || ""} plan.`,
          variant: "destructive",
        })
        return
      }

      if (!uploadLimits.canUpload(file.size)) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
        toast({
          title: "Storage Limit Exceeded",
          description: `This file (${fileSizeMB} MB) would exceed your storage limit. You have ${uploadLimits.remainingStorageFormatted.toFixed(2)} ${uploadLimits.storageUnit} remaining.`,
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleImportUrl = async () => {
    if (!importUrl) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      })
      return
    }

    setImporting(true)
    try {
      const response = await fetch("/api/media/import-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: importUrl,
          name: importName || undefined,
          tags: importTags || undefined,
        }),
      })

      if (response.ok) {
        const newMedia = await response.json()
        setMedia((prev) => [newMedia, ...prev])
        setImportUrl("")
        setImportName("")
        setImportTags("")
        toast({
          title: "Success",
          description: "Media imported successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Import failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Error",
        description: "Import failed",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    setDeleteDialog({
      open: true,
      itemId: id,
      itemName: name,
    })
  }

  const handleConfirmDelete = async () => {
    const { itemId } = deleteDialog

    try {
      const response = await fetch("/api/media/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: itemId }),
      })

      if (response.ok) {
        setMedia((prev) => prev.filter((item) => item.id !== itemId))
        await uploadLimits.refresh()
        setDeleteDialog({ open: false, itemId: "", itemName: "" })
        toast({
          title: "Success",
          description: "Media deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete media",
          variant: "destructive",
        })
        setDeleteDialog({ open: false, itemId: "", itemName: "" })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      })
      setDeleteDialog({ open: false, itemId: "", itemName: "" })
    }
  }

  const handlePreview = (media: MediaItem) => {
    setPreviewMedia(media)
  }

  const handleEdit = (item: MediaItem) => {
    setEditDialog({
      open: true,
      item,
    })
    setEditName(item.name)
    setEditTags(item.tags ? item.tags.join(", ") : "")
  }

  const handleConfirmEdit = async () => {
    if (!editDialog.item) return

    setUpdating(true)
    try {
      const response = await fetch("/api/media/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editDialog.item.id,
          name: editName,
          tags: editTags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
        }),
      })

      if (response.ok) {
        const { media: updatedMedia } = await response.json()
        setMedia((prev) => prev.map((item) => (item.id === updatedMedia.id ? updatedMedia : item)))
        setEditDialog({ open: false, item: null })
        toast({
          title: "Success",
          description: "Media updated successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update media",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Error",
        description: "Failed to update media",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleUploadThumbnail = async (file: File) => {
    if (!editDialog.item) return

    setUploadingThumbnail(true)
    try {
      const formData = new FormData()
      formData.append("mediaId", editDialog.item.id)
      formData.append("thumbnail", file)

      const response = await fetch("/api/media/upload-thumbnail", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setMedia((prev) =>
          prev.map((m) =>
            m.id === editDialog.item!.id
              ? { ...m, thumbnail_path: data.thumbnail_path }
              : m
          )
        )
        setEditDialog((prev) =>
          prev.item
            ? {
                ...prev,
                item: { ...prev.item, thumbnail_path: data.thumbnail_path },
              }
            : prev
        )
        toast({
          title: "Success",
          description: "Thumbnail uploaded successfully",
        })
      } else {
        throw new Error("Failed to upload thumbnail")
      }
    } catch (error) {
      console.error("Error uploading thumbnail:", error)
      toast({
        title: "Error",
        description: "Failed to upload thumbnail",
        variant: "destructive",
      })
    }
  }

  const handleGenerateVideoThumbnail = async () => {
    if (!editDialog.item) return

    setUploadingThumbnail(true)
    try {
      const response = await fetch("/api/media/generate-thumbnail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaId: editDialog.item.id,
          fileUrl: editDialog.item.file_path,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMedia((prev) =>
          prev.map((m) =>
            m.id === editDialog.item!.id
              ? { ...m, thumbnail_path: data.thumbnail_path }
              : m
          )
        )
        setEditDialog((prev) =>
          prev.item
            ? {
                ...prev,
                item: { ...prev.item, thumbnail_path: data.thumbnail_path },
              }
            : prev
        )
        toast({
          title: "Success",
          description: "Thumbnail generated successfully",
        })
      } else {
        throw new Error("Failed to generate thumbnail")
      }
    } catch (error) {
      console.error("Error generating thumbnail:", error)
      toast({
        title: "Error",
        description: "Failed to generate thumbnail",
        variant: "destructive",
      })
    } finally {
      setUploadingThumbnail(false)
    }
  }

  const handleUploadThumbnail = async (file: File) => {
    if (!editDialog.item) return

    try {
      const formData = new FormData()
      formData.append("mediaId", editDialog.item.id)
      formData.append("thumbnail", file)

      const response = await fetch("/api/media/upload-thumbnail", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setMedia((prev) =>
          prev.map((m) =>
            m.id === editDialog.item!.id
              ? { ...m, thumbnail_path: data.thumbnail_path }
              : m
          )
        )
        setEditDialog((prev) =>
          prev.item
            ? {
                ...prev,
                item: { ...prev.item, thumbnail_path: data.thumbnail_path },
              }
            : prev
        )
        toast({
          title: "Success",
          description: "Thumbnail uploaded successfully",
        })
      } else {
        throw new Error("Failed to upload thumbnail")
      }
    } catch (error) {
      console.error("Error uploading thumbnail:", error)
      toast({
        title: "Error",
        description: "Failed to upload thumbnail",
        variant: "destructive",
      })
    }
  }

  const handleGenerateVideoThumbnail = async () => {
    if (!editDialog.item) return

    try {
      const response = await fetch("/api/media/generate-thumbnail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaId: editDialog.item.id,
          fileUrl: editDialog.item.file_path,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMedia((prev) =>
          prev.map((m) =>
            m.id === editDialog.item!.id
              ? { ...m, thumbnail_path: data.thumbnail_path }
              : m
          )
        )
        setEditDialog((prev) =>
          prev.item
            ? {
                ...prev,
                item: { ...prev.item, thumbnail_path: data.thumbnail_path },
              }
            : prev
        )
        toast({
          title: "Success",
          description: "Thumbnail generated successfully",
        })
      } else {
        throw new Error("Failed to generate thumbnail")
      }
    } catch (error) {
      console.error("Error generating thumbnail:", error)
      toast({
        title: "Error",
        description: "Failed to generate thumbnail",
        variant: "destructive",
      })
    }
  }

  const filteredMedia = media.filter((item) => {
    if (!item || !item.name) return false

    const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const tagMatch =
      item.tags &&
      Array.isArray(item.tags) &&
      item.tags.some((tag) => tag && typeof tag === "string" && tag.toLowerCase().includes(searchTerm.toLowerCase()))

    return nameMatch || tagMatch
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        <p className="text-sm text-gray-600">Loading media library...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-1">Upload and manage your digital signage content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            <Grid className="h-5 w-5" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Add Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!uploadLimits.loading && (
            <StorageUsageBar
              currentFormatted={uploadLimits.currentStorageFormatted}
              maxStorage={uploadLimits.maxStorage}
              storageUnit={uploadLimits.storageUnit}
              usagePercentage={uploadLimits.storageUsagePercentage}
              planName={uploadLimits.planName}
            />
          )}

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="import">
                <LinkIcon className="h-4 w-4 mr-2" />
                Import URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <SimpleUploader
                onUploadComplete={async (media) => {
                  setMedia((prev) => [media as MediaItem, ...prev])
                  await uploadLimits.refresh()
                  toast({
                    title: "Success",
                    description: "File uploaded successfully",
                  })
                }}
                onUploadError={(error) => {
                  toast({
                    title: "Upload Failed",
                    description: error,
                    variant: "destructive",
                  })
                }}
                maxFileSizeMB={Math.round(uploadLimits.maxFileSize / (1024 * 1024))}
              />
            </TabsContent>

            {/* Smart Upload Tab */}
            <TabsContent value="smart-upload" className="mt-4">
              <SmartFileUploader
                onUploadSuccess={async () => {
                  await fetchMedia()
                  await uploadLimits.refresh()
                  toast({
                    title: "Success",
                    description: "File uploaded successfully",
                  })
                }}
                onUploadError={(error) => {
                  toast({
                    title: "Upload Failed",
                    description: error,
                    variant: "destructive",
                  })
                }}
              />
            </TabsContent>

            <TabsContent value="import" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Input
                  placeholder="Google Slides or YouTube URL"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="w-full"
                />
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Name (optional)"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Tags (comma separated)"
                    value={importTags}
                    onChange={(e) => setImportTags(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleImportUrl}
                    disabled={!importUrl || importing}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    {importing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Import
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Supported: Google Slides presentations and YouTube videos. External URLs don't count toward your storage
                limit.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredMedia.length} of {media.length} items
        </div>
      </div>

      {/* Media Grid/List */}
      {filteredMedia.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No media found</h3>
            <p className="text-gray-600 text-center">
              {media.length === 0
                ? "Upload your first media file to get started"
                : "No media matches your search criteria"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"
          }
        >
          {filteredMedia.map((item) => (
            <Card key={item.id} className="group hover:shadow-lg transition-shadow">
              {viewMode === "grid" ? (
                <div>
                  <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
                    {item.thumbnail_path ? (
                      <img
                        src={item.thumbnail_path}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : item.mime_type && item.mime_type.startsWith("image/") ? (
                      <img
                        src={item.file_path || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Video className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreview(item)}
                        className="bg-white/90 hover:bg-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="bg-white/90 hover:bg-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, item.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{formatFileSize(item.file_size)}</p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </div>
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.mime_type && item.mime_type.startsWith("image/") ? (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      ) : (
                        <Video className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(item.file_size)} • {new Date(item.created_at).toLocaleDateString()}
                      </p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(item)}
                        className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, item.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {previewMedia && (
        <MediaPreviewModal media={previewMedia} isOpen={!!previewMedia} onClose={() => setPreviewMedia(null)} />
      )}

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Media File"
        description={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone and will permanently remove the file from your media library.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>Update the name and tags for this media item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter media name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Enter tags (comma separated)"
              />
              <p className="text-sm text-gray-500">Separate multiple tags with commas</p>
            </div>
          </div>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, item: null })} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEdit} disabled={updating || !editName.trim()}>
              {updating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
