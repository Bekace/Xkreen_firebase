"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, AlertCircle, ImageIcon, Video } from "lucide-react"

interface MediaItem {
  id: string
  filename: string
  fileUrl: string
  fileType: string
  duration: number
  transitionType: string
  transitionDuration: number
}

interface MediaRendererProps {
  media: MediaItem
  isActive: boolean
  onLoadComplete?: () => void
  onError?: (error: string) => void
}

export function MediaRenderer({ media, isActive, onLoadComplete, onError }: MediaRendererProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Reset states when media changes
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
    setErrorMessage("")
  }, [media.id])

  // Handle video playback
  useEffect(() => {
    if (videoRef.current && media.fileType.startsWith("video/")) {
      const video = videoRef.current

      if (isActive) {
        video.play().catch((err) => {
          console.error("Video play failed:", err)
          setHasError(true)
          setErrorMessage("Failed to play video")
          onError?.("Failed to play video")
        })
      } else {
        video.pause()
      }
    }
  }, [isActive, media.fileType, onError])

  const handleImageLoad = () => {
    setIsLoading(false)
    onLoadComplete?.()
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
    setErrorMessage("Failed to load image")
    onError?.("Failed to load image")
  }

  const handleVideoLoad = () => {
    setIsLoading(false)
    onLoadComplete?.()
  }

  const handleVideoError = () => {
    setIsLoading(false)
    setHasError(true)
    setErrorMessage("Failed to load video")
    onError?.("Failed to load video")
  }

  // Get transition classes
  const getTransitionClasses = () => {
    const baseClasses = "transition-all duration-1000 ease-in-out"

    switch (media.transitionType) {
      case "fade":
        return `${baseClasses} ${isActive ? "opacity-100" : "opacity-0"}`
      case "slide":
        return `${baseClasses} transform ${isActive ? "translate-x-0" : "translate-x-full"}`
      case "zoom":
        return `${baseClasses} transform ${isActive ? "scale-100" : "scale-110"}`
      default:
        return `${baseClasses} ${isActive ? "opacity-100" : "opacity-0"}`
    }
  }

  if (hasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Media Error</h3>
            <p className="text-muted-foreground">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">{media.filename}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`absolute inset-0 flex items-center justify-center ${getTransitionClasses()}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading media...</p>
          </div>
        </div>
      )}

      {media.fileType.startsWith("image/") ? (
        <img
          ref={imageRef}
          src={media.fileUrl || "/placeholder.svg"}
          alt={media.filename}
          className="max-w-full max-h-full object-contain"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : media.fileType.startsWith("video/") ? (
        <video
          ref={videoRef}
          src={media.fileUrl}
          className="max-w-full max-h-full object-contain"
          muted
          playsInline
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          preload="metadata"
        />
      ) : (
        <div className="text-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            {media.fileType.startsWith("image/") ? (
              <ImageIcon className="h-16 w-16 text-muted-foreground" />
            ) : (
              <Video className="h-16 w-16 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Unsupported Media</h3>
            <p className="text-muted-foreground">{media.fileType}</p>
            <p className="text-sm text-muted-foreground">{media.filename}</p>
          </div>
        </div>
      )}
    </div>
  )
}
