"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X } from "lucide-react"

interface Screen {
  id: string
  name: string
  screen_code: string
  background_color?: string
}

interface MediaItem {
  id: string
  name: string
  file_path: string
  mime_type: string
}

interface ContentItem {
  id: string
  media: MediaItem
  duration_override: number
  transition_type?: string
  transition_duration?: number
}

export function ScreenPreviewModal({
  screen,
  isOpen,
  onClose,
}: {
  screen: Screen | null
  isOpen: boolean
  onClose: () => void
}) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const backgroundColor = screen?.background_color || "#000000"

  const fetchScreenContent = async () => {
    if (!screen?.screen_code) return

    setLoading(true)
    try {
      const response = await fetch(`/api/screens/config/${screen.screen_code}`)
      if (response.ok) {
        const data = await response.json()
        const contentItems = data.screen?.content || []
        setContent(contentItems)
        setCurrentIndex(0)
        setTimeRemaining(contentItems[0]?.duration_override || 10)
      }
    } catch (error) {
      console.error("Error fetching screen content:", error)
    } finally {
      setLoading(false)
    }
  }

  const goToNext = useCallback(() => {
    if (content.length === 0) return

    const nextIndex = currentIndex + 1 < content.length ? currentIndex + 1 : 0
    const nextItem = content[nextIndex]
    const transitionDuration = nextItem?.transition_duration || 0.8

    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(nextIndex)
      setTimeRemaining(nextItem?.duration_override || 10)
      setIsTransitioning(false)
    }, transitionDuration * 1000)
  }, [currentIndex, content])

  const goToPrevious = useCallback(() => {
    if (content.length === 0) return

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : content.length - 1
    const prevItem = content[prevIndex]
    const transitionDuration = prevItem?.transition_duration || 0.8

    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(prevIndex)
      setTimeRemaining(prevItem?.duration_override || 10)
      setIsTransitioning(false)
    }, transitionDuration * 1000)
  }, [currentIndex, content])

  useEffect(() => {
    if (isOpen && screen) {
      fetchScreenContent()
    } else {
      setCurrentIndex(0)
      setIsPlaying(false)
      setTimeRemaining(0)
      setContent([])
      setIsFullscreen(false)
    }
  }, [isOpen, screen])

  useEffect(() => {
    if (content.length > 0 && !isPlaying) {
      setIsPlaying(true)
    }
  }, [content])

  useEffect(() => {
    if (isPlaying && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (isPlaying && timeRemaining === 0) {
      goToNext()
    }
  }, [isPlaying, timeRemaining, goToNext])

  const isYouTubeVideo = (media: MediaItem) => {
    return (
      media.mime_type === "video/youtube" ||
      media.file_path?.includes("youtube.com") ||
      media.file_path?.includes("youtu.be") ||
      media.file_path?.includes("youtube-nocookie.com")
    )
  }

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      let embedUrl = url

      // Convert youtube.com/watch?v= to embed URL
      if (url.includes("youtube.com/watch")) {
        const urlObj = new URL(url)
        const videoId = urlObj.searchParams.get("v")
        if (videoId) {
          embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
        }
      }
      // Convert youtu.be/ to embed URL
      else if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0]
        if (videoId) {
          embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
        }
      }
      // If already an embed URL, use youtube-nocookie.com
      else if (url.includes("youtube.com/embed/")) {
        embedUrl = url.replace("youtube.com", "youtube-nocookie.com")
      }

      const urlObj = new URL(embedUrl)
      urlObj.searchParams.set("autoplay", "1")
      urlObj.searchParams.set("mute", "1")
      urlObj.searchParams.set("controls", "0")
      urlObj.searchParams.set("showinfo", "0")
      urlObj.searchParams.set("fs", "0")
      urlObj.searchParams.set("modestbranding", "1")
      urlObj.searchParams.set("iv_load_policy", "3")
      urlObj.searchParams.set("rel", "0")
      return urlObj.toString()
    } catch (error) {
      console.error("[v0] Error parsing YouTube URL:", error)
      return url
    }
  }

  const isGoogleSlides = (media: MediaItem) => {
    return media.file_path?.includes("docs.google.com/presentation") || media.mime_type === "application/slides"
  }

  const getGoogleSlidesEmbedUrl = (url: string) => {
    if (url.includes("/embed?")) return url
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (match) {
      return `https://docs.google.com/presentation/d/${match[1]}/embed?start=true&loop=true&delayms=3000`
    }
    return url
  }

  const getTransitionStyles = (isTransitioning: boolean) => {
    const item = content[currentIndex]
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

    switch (transitionType) {
      case "slide-left":
        return { ...baseStyle, opacity: 0, transform: "translateX(-100%)" }
      case "slide-right":
        return { ...baseStyle, opacity: 0, transform: "translateX(100%)" }
      case "zoom":
        return { ...baseStyle, opacity: 0, transform: "scale(0.8)" }
      case "cross-fade":
        return { ...baseStyle, opacity: 0, transform: "scale(1.05)" }
      case "fade":
      default:
        return { ...baseStyle, opacity: 0 }
    }
  }

  const renderMedia = () => {
    if (!content.length || currentIndex >= content.length) return null

    const item = content[currentIndex]
    const mediaStyle = getTransitionStyles(isTransitioning)

    if (isYouTubeVideo(item.media)) {
      const embedUrl = getYouTubeEmbedUrl(item.media.file_path)
      return (
        <div className="relative w-full h-full overflow-hidden">
          <iframe
            key={item.id}
            src={embedUrl}
            style={mediaStyle}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
          <video
            ref={videoRef}
            src={item.media.file_path}
            style={mediaStyle}
            autoPlay
            muted={volume === 0}
            onEnded={goToNext}
          />
        ) : (
          <div style={mediaStyle} className="flex items-center justify-center bg-gray-100 text-gray-500">
            <p>Unsupported media type</p>
          </div>
        )}
      </div>
    )
  }

  if (!screen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-full h-full p-0 bg-black border-none" style={{ backgroundColor }}>
        <DialogTitle className="sr-only">{`Preview of ${screen.name}`}</DialogTitle>
        <DialogDescription className="sr-only">
          This is a preview of the content assigned to the screen. You can control the playback using the controls at the top of the screen.
        </DialogDescription>
        <div ref={containerRef} className="relative w-full h-full">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <h2 className="text-white font-semibold">{screen.name}</h2>
                <span className="text-white/70 text-sm">
                  {content.length > 0 ? `${currentIndex + 1} / ${content.length}` : "Loading..."}
                </span>
                {isPlaying && <span className="text-cyan-400 text-sm">● Playing</span>}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevious}
                  className="text-white hover:bg-white/20"
                  disabled={content.length === 0}
                >
                  <SkipBack className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNext}
                  className="text-white hover:bg-white/20"
                  disabled={content.length === 0}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVolume(volume === 0 ? 1 : 0)}
                  className="text-white hover:bg-white/20"
                >
                  {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>

                <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="w-full h-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-white">Loading content...</p>
              </div>
            ) : content.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-white">No content assigned to this screen</p>
              </div>
            ) : (
              renderMedia()
            )}
          </div>

          {/* Timer */}
          {isPlaying && content.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-white text-sm">{timeRemaining}s</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
