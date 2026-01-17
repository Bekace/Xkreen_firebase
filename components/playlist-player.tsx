"use client"

import { useState, useEffect, useCallback } from "react"
import { MediaRenderer } from "./media-renderer"
import { Play, Pause, SkipForward, SkipBack } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaItem {
  id: string
  filename: string
  fileUrl: string
  fileType: string
  duration: number
  transitionType: string
  transitionDuration: number
}

interface PlaylistPlayerProps {
  media: MediaItem[]
  backgroundColor?: string
  autoPlay?: boolean
  showControls?: boolean
  onMediaChange?: (index: number) => void
}

export function PlaylistPlayer({
  media,
  backgroundColor,
  autoPlay = true,
  showControls = false,
  onMediaChange,
}: PlaylistPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [preloadedIndices, setPreloadedIndices] = useState<Set<number>>(new Set([0]))

  const currentMedia = media[currentIndex]

  // Preload next media items
  const preloadNextMedia = useCallback(
    (index: number) => {
      const nextIndex = (index + 1) % media.length
      const prevIndex = (index - 1 + media.length) % media.length

      setPreloadedIndices((prev) => new Set([...prev, index, nextIndex, prevIndex]))
    },
    [media.length],
  )

  // Handle media progression
  const nextMedia = useCallback(() => {
    const nextIndex = (currentIndex + 1) % media.length
    setCurrentIndex(nextIndex)
    onMediaChange?.(nextIndex)
    preloadNextMedia(nextIndex)
  }, [currentIndex, media.length, onMediaChange, preloadNextMedia])

  const prevMedia = useCallback(() => {
    const prevIndex = (currentIndex - 1 + media.length) % media.length
    setCurrentIndex(prevIndex)
    onMediaChange?.(prevIndex)
    preloadNextMedia(prevIndex)
  }, [currentIndex, media.length, onMediaChange, preloadNextMedia])

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying || !currentMedia) return

    const duration = currentMedia.duration * 1000 // Convert to milliseconds
    const timer = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % media.length
      setCurrentIndex(nextIndex)
      onMediaChange?.(nextIndex)
      preloadNextMedia(nextIndex)
    }, duration)

    return () => clearTimeout(timer)
  }, [currentIndex, currentMedia, isPlaying, media.length, onMediaChange, preloadNextMedia])

  // Preload initial media
  useEffect(() => {
    preloadNextMedia(0)
  }, [preloadNextMedia])

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  if (!media.length) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">No media in playlist</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 relative overflow-hidden"
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      {/* Render current and preloaded media */}
      {media.map((mediaItem, index) => {
        const isActive = index === currentIndex
        const shouldRender = isActive || preloadedIndices.has(index)

        if (!shouldRender) return null

        return (
          <MediaRenderer
            key={`${mediaItem.id}-${index}`}
            media={mediaItem}
            isActive={isActive}
            onLoadComplete={() => {
              // Media loaded successfully
            }}
            onError={(error) => {
              console.error(`Media error for ${mediaItem.filename}:`, error)
              // Auto-advance on error after a short delay
              setTimeout(nextMedia, 2000)
            }}
          />
        )
      })}

      {/* Playback Controls */}
      {showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border">
          <Button variant="ghost" size="sm" onClick={prevMedia}>
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={togglePlayPause}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="sm" onClick={nextMedia}>
            <SkipForward className="h-4 w-4" />
          </Button>

          <div className="text-xs text-muted-foreground border-l pl-2 ml-2">
            {currentIndex + 1} / {media.length}
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {media.length > 1 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-1">
          {media.map((_, index) => (
            <div
              key={index}
              className={`h-1 w-8 rounded-full transition-colors ${index === currentIndex ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
