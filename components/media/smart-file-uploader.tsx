"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface UploadValidation {
  isValid: boolean
  error?: string
  maxFileSize?: number
  remainingSpace?: number
  currentStorage?: number
  maxStorage?: number
}

interface SmartFileUploaderProps {
  onUploadSuccess?: () => void
  onUploadError?: (error: string) => void
}

export function SmartFileUploader({ onUploadSuccess, onUploadError }: SmartFileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tags, setTags] = useState("")
  const [uploading, setUploading] = useState(false)
  const [validationResult, setValidationResult] = useState<UploadValidation | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const validateFile = useCallback(async (file: File): Promise<UploadValidation> => {
    try {
      console.log("[v0] Validating file:", file.name, file.size)

      // Fetch upload settings from database
      const settingsResponse = await fetch("/api/admin/upload-settings")
      if (!settingsResponse.ok) {
        return {
          isValid: false,
          error: "Failed to fetch upload settings. Please try again.",
        }
      }

      const settings = await settingsResponse.json()
      console.log("[v0] Upload settings:", settings)

      // Fetch user's subscription limits and current storage
      const limitsResponse = await fetch("/api/upload-limits")
      if (!limitsResponse.ok) {
        return {
          isValid: false,
          error: "Failed to fetch storage limits. Please try again.",
        }
      }

      const limits = await limitsResponse.json()
      console.log("[v0] User limits:", limits)

      // Determine max file size (from settings or plan limit)
      const dbMaxFileSize = settings.settings?.max_file_size || null
      const planMaxFileSize = limits.maxFileSize || 52428800 // 50 MB default
      const maxFileSize = dbMaxFileSize || planMaxFileSize

      console.log("[v0] Max file size check:", { dbMaxFileSize, planMaxFileSize, maxFileSize })

      // Validate file size against max file size
      if (file.size > maxFileSize) {
        return {
          isValid: false,
          error: `File size (${formatBytes(file.size)}) exceeds the maximum allowed size of ${formatBytes(maxFileSize)}.`,
          maxFileSize,
        }
      }

      // Validate file type if configured
      const allowedTypes = settings.settings?.allowed_file_types
      if (allowedTypes && Array.isArray(allowedTypes) && allowedTypes.length > 0) {
        const fileType = file.type.split("/")[0] // Get "image", "video", etc.
        const fileExtension = file.name.split(".").pop()?.toLowerCase()

        const isTypeAllowed = allowedTypes.some((allowed: string) => {
          if (allowed === "image" && fileType === "image") return true
          if (allowed === "video" && fileType === "video") return true
          if (allowed === "audio" && fileType === "audio") return true
          if (allowed === "document" && (fileType === "application" || fileExtension === "pdf")) return true
          return false
        })

        if (!isTypeAllowed) {
          return {
            isValid: false,
            error: `File type "${fileType}" is not allowed. Allowed types: ${allowedTypes.join(", ")}.`,
          }
        }
      }

      // Calculate remaining space
      const currentStorageBytes = limits.currentStorageBytes || 0
      const maxStorageBytes = limits.maxStorage || 0
      const remainingBytes = maxStorageBytes - currentStorageBytes

      console.log("[v0] Storage check:", {
        currentStorageBytes,
        maxStorageBytes,
        remainingBytes,
        fileSize: file.size,
      })

      // Check if file fits in remaining space
      if (file.size > remainingBytes) {
        return {
          isValid: false,
          error: `File size (${formatBytes(file.size)}) exceeds your remaining storage space of ${formatBytes(remainingBytes)}. Current usage: ${formatBytes(currentStorageBytes)} / ${formatBytes(maxStorageBytes)}.`,
          remainingSpace: remainingBytes,
          currentStorage: currentStorageBytes,
          maxStorage: maxStorageBytes,
        }
      }

      // All validations passed
      return {
        isValid: true,
        maxFileSize,
        remainingSpace: remainingBytes,
        currentStorage: currentStorageBytes,
        maxStorage: maxStorageBytes,
      }
    } catch (error) {
      console.error("[v0] Validation error:", error)
      return {
        isValid: false,
        error: "Failed to validate file. Please try again.",
      }
    }
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      setValidationResult(null)
      return
    }

    setSelectedFile(file)
    setUploadProgress(0)

    // Validate the file
    const validation = await validateFile(file)
    setValidationResult(validation)

    if (!validation.isValid) {
      console.error("[v0] File validation failed:", validation.error)
    } else {
      console.log("[v0] File validation passed")
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !validationResult?.isValid) return

    setUploading(true)
    setUploadProgress(10)

    try {
      console.log("[v0] Starting upload for file:", selectedFile.name)

      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("tags", tags)

      setUploadProgress(30)

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })

      setUploadProgress(80)

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorMessage = "Failed to upload file"

        if (contentType?.includes("application/json")) {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } else {
          const errorText = await response.text()
          errorMessage = errorText || response.statusText
        }

        console.error("[v0] Upload failed:", errorMessage)
        setValidationResult({
          isValid: false,
          error: errorMessage,
        })
        onUploadError?.(errorMessage)
        return
      }

      const data = await response.json()
      console.log("[v0] Upload successful:", data)

      setUploadProgress(100)

      // Reset form
      setSelectedFile(null)
      setTags("")
      setValidationResult(null)
      setUploadProgress(0)

      // Notify parent component
      onUploadSuccess?.()
    } catch (error) {
      console.error("[v0] Upload error:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      setValidationResult({
        isValid: false,
        error: errorMessage,
      })
      onUploadError?.(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Smart File Uploader
        </CardTitle>
        <CardDescription>Upload files with automatic validation against your storage limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="space-y-2">
          <Label htmlFor="smart-file-input">Select File</Label>
          <Input
            id="smart-file-input"
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {/* Tags Input */}
        {selectedFile && (
          <div className="space-y-2">
            <Label htmlFor="tags-input">Tags (comma separated)</Label>
            <Input
              id="tags-input"
              placeholder="e.g. marketing, promo, 2024"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={uploading}
            />
          </div>
        )}

        {/* File Info */}
        {selectedFile && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Selected File:</span>
              <span className="text-muted-foreground">{selectedFile.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">File Size:</span>
              <span className="text-muted-foreground">{formatBytes(selectedFile.size)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">File Type:</span>
              <span className="text-muted-foreground">{selectedFile.type || "Unknown"}</span>
            </div>
          </div>
        )}

        {/* Validation Result */}
        {validationResult && (
          <>
            {validationResult.isValid ? (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  File validation passed! Ready to upload.
                  {validationResult.remainingSpace && (
                    <div className="mt-2 text-xs">
                      Remaining space: {formatBytes(validationResult.remainingSpace)} /{" "}
                      {formatBytes(validationResult.maxStorage || 0)}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationResult.error}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !validationResult?.isValid || uploading}
          className="w-full bg-cyan-500 hover:bg-cyan-600"
          size="lg"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
