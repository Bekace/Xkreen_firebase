"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, CheckCircle, AlertCircle, FileVideo, FileImage, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedMedia {
  id: string
  name: string
  file_path: string
  file_size: number
  mime_type: string
  tags: string[]
}

interface SimpleUploaderProps {
  onUploadComplete?: (media: UploadedMedia) => void
  onUploadError?: (error: string) => void
  maxFileSizeMB?: number
  allowedTypes?: string[]
  className?: string
}

type UploadStatus = "idle" | "uploading" | "success" | "error"

export function SimpleUploader({
  onUploadComplete,
  onUploadError,
  maxFileSizeMB = 500,
  allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/webm",
    "application/pdf",
  ],
  className,
}: SimpleUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type "${file.type}" is not supported`
    }
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxFileSizeMB} MB limit`
    }
    return null
  }

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setStatus("error")
      onUploadError?.(validationError)
      return
    }

    setStatus("uploading")
    setProgress(0)
    setError(null)

    try {
      // Step 1: Get upload URL from server
      setProgress(10)
      const urlResponse = await fetch("/api/media/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      })

      if (!urlResponse.ok) {
        const data = await urlResponse.json()
        throw new Error(data.error || "Failed to get upload URL")
      }

      const { uploadUrl, publicUrl, gcsFileName, bucketName } = await urlResponse.json()
      setProgress(20)

      // Step 2: Upload directly to GCS using the resumable upload URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "Content-Length": file.size.toString(),
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        throw new Error(`Upload failed: ${errorText}`)
      }

      setProgress(80)

      // Step 3: Confirm upload and save metadata
      const confirmResponse = await fetch("/api/media/confirm-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          publicUrl,
          gcsFileName,
          bucketName,
        }),
      })

      if (!confirmResponse.ok) {
        const data = await confirmResponse.json()
        throw new Error(data.error || "Failed to confirm upload")
      }

      const mediaData = await confirmResponse.json()
      setProgress(100)
      setStatus("success")
      setSelectedFile(null)
      onUploadComplete?.(mediaData)

      // Reset after 2 seconds
      setTimeout(() => {
        setStatus("idle")
        setProgress(0)
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed"
      setError(errorMessage)
      setStatus("error")
      onUploadError?.(errorMessage)
    }
  }

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setSelectedFile(file)
    uploadFile(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const getFileIcon = (type: string) => {
    if (type.startsWith("video/")) return FileVideo
    if (type.startsWith("image/")) return FileImage
    return FileText
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-colors",
          dragOver && "border-primary bg-primary/5",
          status === "error" && "border-destructive bg-destructive/5",
          status === "success" && "border-green-500 bg-green-500/5",
          status === "idle" && "border-muted-foreground/25 hover:border-muted-foreground/50",
        )}
      >
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="p-4 rounded-full bg-muted">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground mt-1">Max {maxFileSizeMB} MB per file</p>
            </div>
            <input
              type="file"
              accept={allowedTypes.join(",")}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        )}

        {status === "uploading" && selectedFile && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 w-full max-w-md">
              {(() => {
                const Icon = getFileIcon(selectedFile.type)
                return <Icon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              })()}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <div className="w-full max-w-md">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center mt-2">Uploading... {progress}%</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="font-medium text-green-500">Upload complete!</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">Upload failed</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStatus("idle")
                setError(null)
                setSelectedFile(null)
              }}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
