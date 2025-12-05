"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, RefreshCw, ArrowLeft, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CameraAnalytics } from "@/components/camera-analytics"
import CameraSetup from "@/components/camera-setup"
import { useTVNavigation } from "@/hooks/use-tv-navigation"

interface MediaItem {
  id: string
  position: number
  duration_override: number | null
  transition_type: string | null
  transition_duration: number | null
  media: {
    id: string
    name: string
    file_path: string
    mime_type: string
    file_size: number
    duration: number | null
  }
}

interface ScreenConfig {
  device: {
    id: string
    code: string
    name: string
    orientation: string
    resolution: string
  }
  screen: {
    id: string
    name: string
    content: MediaItem[]
    playlist: {
      id: string
      name: string
      background_color: string
      scale_image?: string
      scale_video?: string
      scale_document?: string
      shuffle?: boolean
      default_transition?: string
    } | null
    updated_at: string
  }
}

interface PlayerPageProps {
  params: { deviceCode: string }
}

export default function PlayerPage({ params }: PlayerPageProps) {
  const [config, setConfig] = useState<ScreenConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [shuffledContent, setShuffledContent] = useState<MediaItem[]>([])
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const router = useRouter()
  const [showCameraSetup, setShowCameraSetup] = useState(false)
  const [showLeftPanel, setShowLeftPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<ScreenConfig | null>(null)
  const [updateProgress, setUpdateProgress] = useState(0)
  const lastUpdatedAtRef = useRef<string | null>(null)
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false)
  const configRef = useRef<ScreenConfig | null>(null)

  const { isTVMode } = useTVNavigation({
    onUp: () => {
      if (!showCameraSetup && !showLeftPanel && !showRightPanel) {
        console.log("[v0] TV Navigation - Up pressed")
        // Navigate to previous media
        setCurrentMediaIndex((prev) => {
          const newIndex = prev - 1
          return newIndex < 0 ? (shuffledContent.length || config?.screen.content?.length || 1) - 1 : newIndex
        })
      }
    },
    onDown: () => {
      if (!showCameraSetup && !showLeftPanel && !showRightPanel) {
        console.log("[v0] TV Navigation - Down pressed")
        // Navigate to next media
        const contentLength = shuffledContent.length || config?.screen.content?.length || 0
        setCurrentMediaIndex((prev) => {
          const newIndex = prev + 1
          return newIndex >= contentLength ? 0 : newIndex
        })
      }
    },
    onLeft: () => {
      if (!showCameraSetup) {
        console.log("[v0] TV Navigation - Left pressed, toggling left panel")
        setShowLeftPanel((prev) => !prev)
        setShowRightPanel(false)
      }
    },
    onRight: () => {
      if (!showCameraSetup) {
        console.log("[v0] TV Navigation - Right pressed, toggling right panel")
        setShowRightPanel((prev) => !prev)
        setShowLeftPanel(false)
      }
    },
    onMenu: () => {
      if (!showCameraSetup) {
        console.log("[v0] TV Navigation - Menu pressed, toggling right panel")
        setShowRightPanel((prev) => !prev)
      }
    },
    onBack: () => {
      console.log("[v0] TV Navigation - Back pressed")
      if (showLeftPanel || showRightPanel) {
        setShowLeftPanel(false)
        setShowRightPanel(false)
      } else if (showCameraSetup) {
        setShowCameraSetup(false)
      }
    },
    enabled: !loading && !error,
  })

  const shuffleArray = (array: MediaItem[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const fetchConfig = async () => {
    try {
      console.log("[v0] Fetching config for:", params.deviceCode)
      const isScreenCode = params.deviceCode.startsWith("SCR-")
      console.log("[v0] Is screen code:", isScreenCode)

      const apiEndpoint = isScreenCode
        ? `/api/screens/config/${params.deviceCode}`
        : `/api/devices/config/${params.deviceCode}`

      console.log("[v0] API endpoint:", apiEndpoint)

      const response = await fetch(apiEndpoint, {
        cache: "no-store",
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] API error response:", errorText)
        throw new Error(`Failed to fetch config: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] API response data:", data)

      if (data.screen?.content) {
        console.log("[v0] Content array length:", data.screen.content.length)
        console.log("[v0] Content items:", data.screen.content)
        data.screen.content.forEach((item: any, index: number) => {
          console.log(`[v0] Content item ${index}:`, {
            id: item.id,
            type: item.media?.type,
            name: item.media?.name,
            url: item.media?.url,
          })
        })
      } else {
        console.log("[v0] No content array in response!")
      }

      const mappedConfig: ScreenConfig = {
        device: {
          id: data.screen.id,
          code: params.deviceCode,
          name: data.screen.name,
          orientation: data.screen.orientation,
          resolution: data.screen.resolution,
        },
        screen: {
          id: data.screen.id,
          name: data.screen.name,
          content: data.screen.content || [],
          playlist: data.screen.playlist || null,
          updated_at: data.screen.updated_at,
        },
      }

      console.log("[v0] Mapped config data:", mappedConfig)

      setConfig(mappedConfig)
      configRef.current = mappedConfig

      if (mappedConfig.screen?.updated_at) {
        lastUpdatedAtRef.current = mappedConfig.screen.updated_at
      }

      setLoading(false)
      setHasPendingUpdate(false)
    } catch (err) {
      console.error("[v0] Error fetching config:", err)
      setError(err instanceof Error ? err.message : "Failed to load configuration")
      setLoading(false)
    }
  }

  const fetchAnalyticsSettings = async (screenId: string) => {
    console.log("[v0] fetchAnalyticsSettings temporarily disabled, using default enabled state")
    return

    /* Original code - temporarily disabled
    try {
      console.log("[v0] Fetching analytics settings for screen:", screenId)
      const response = await fetch(`/api/analytics/settings?screenId=${screenId}`)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Analytics settings fetched:", data)
        setAnalyticsEnabled(data.enabled || false)
      } else {
        console.log("[v0] Failed to fetch analytics settings, status:", response.status)
        setAnalyticsEnabled(false)
      }
    } catch (err) {
      console.error("[v0] Error fetching analytics settings:", err)
      setAnalyticsEnabled(false)
    }
    */
  }

  const sendHeartbeat = async () => {
    try {
      await fetch(`/api/devices/heartbeat/${params.deviceCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: new Date().toISOString() }),
      })
    } catch (err) {
      // Silent fail for heartbeat
    }
  }

  useEffect(() => {
    fetchConfig()

    const checkForUpdates = async () => {
      if (!configRef.current) {
        console.log("[v0] Polling: No config yet, skipping check")
        return
      }

      try {
        console.log("[v0] Polling: Checking for updates...")
        console.log("[v0] Polling: Current lastUpdatedAt:", lastUpdatedAtRef.current)

        const isScreenCode = params.deviceCode.startsWith("SCR-")
        const apiEndpoint = isScreenCode
          ? `/api/screens/config/${params.deviceCode}`
          : `/api/devices/config/${params.deviceCode}`

        const response = await fetch(apiEndpoint, {
          cache: "no-store",
        })

        if (response.ok) {
          const data = await response.json()
          const newUpdatedAt = data.screen?.updated_at

          console.log("[v0] Polling: New updated_at from API:", newUpdatedAt)

          if (newUpdatedAt && lastUpdatedAtRef.current && newUpdatedAt !== lastUpdatedAtRef.current) {
            console.log("[v0] Polling: Update detected! Queueing refresh...")
            setHasPendingUpdate(true)
          }

          lastUpdatedAtRef.current = newUpdatedAt
        }
      } catch (error) {
        console.error("[v0] Polling: Error checking for updates:", error)
      }
    }

    const isScreenCode = params.deviceCode.startsWith("SCR-")
    let heartbeatInterval: NodeJS.Timeout | null = null
    let pollingInterval: NodeJS.Timeout | null = null

    if (!isScreenCode) {
      heartbeatInterval = setInterval(sendHeartbeat, 30000)
    }

    setTimeout(() => {
      pollingInterval = setInterval(checkForUpdates, 15000)
    }, 5000)

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [params.deviceCode])

  useEffect(() => {
    if (!config) return

    if (config.screen?.updated_at) {
      lastUpdatedAtRef.current = config.screen.updated_at
    }

    if (config.screen.content && config.screen.playlist?.shuffle) {
      setShuffledContent(shuffleArray(config.screen.content))
    } else {
      setShuffledContent(config.screen.content || [])
    }

    if (config.screen.id) {
      console.log("[v0] Analytics enabled by default for testing, screenId:", config.screen.id)
      // fetchAnalyticsSettings(config.screen.id)
    }
  }, [config])

  useEffect(() => {
    if (hasPendingUpdate) {
      console.log("[v0] Pending update detected, will refresh when media finishes")
      const contentLength = shuffledContent.length || config?.screen.content?.length || 0

      // Check if we're at the end of a media cycle to apply the update
      const handleMediaEnd = () => {
        console.log("[v0] Applying pending update now...")
        fetchConfig()
      }

      // Queue the update to happen when current media index changes
      const timer = setTimeout(() => {
        handleMediaEnd()
      }, 1000) // Small delay to allow current media transition

      return () => clearTimeout(timer)
    }
  }, [hasPendingUpdate, currentMediaIndex])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    fetchConfig()
  }

  const handleBackToSetup = () => {
    router.push("/player")
  }

  const handleCameraConfigured = (deviceId: string, settings: MediaTrackSettings) => {
    const cameraConfig = {
      deviceId,
      settings,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem("cameraConfig", JSON.stringify(cameraConfig))
    console.log("[v0] Camera configured and saved:", cameraConfig)
    setShowCameraSetup(false)
    if (analyticsEnabled && config?.screen.id) {
      fetchAnalyticsSettings(config.screen.id)
    }
  }

  const getMediaUrl = (filePath: string) => {
    if (!filePath) return "/placeholder.svg"
    if (filePath.startsWith("http")) return filePath
    if (filePath.startsWith("blob/")) return `https://blob.vercel-storage.com/${filePath}`
    return filePath
  }

  const isGoogleSlides = (media: MediaItem["media"]) => {
    return (
      media.mime_type === "application/vnd.google-apps.presentation" ||
      media.name.toLowerCase().includes("google slides") ||
      media.file_path.includes("docs.google.com/presentation")
    )
  }

  const isYouTubeVideo = (media: MediaItem["media"]) => {
    return (
      media.mime_type === "video/youtube" ||
      media.file_path.includes("youtube.com") ||
      media.file_path.includes("youtu.be") ||
      media.file_path.includes("youtube-nocookie.com")
    )
  }

  const getYouTubeUrlWithAutoplay = (url: string) => {
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
      return urlObj.toString()
    } catch (error) {
      console.error("[v0] Error parsing YouTube URL:", error)
      return url
    }
  }

  const getGoogleSlidesEmbedUrl = (media: MediaItem["media"]) => {
    let presentationId = ""

    if (media.file_path.includes("docs.google.com/presentation")) {
      const match = media.file_path.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/)
      if (match) presentationId = match[1]
    } else if (media.name.includes("-")) {
      const parts = media.name.split("-")
      presentationId = parts[parts.length - 1].trim()
    }

    if (presentationId) {
      return `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000&rm=minimal&chrome=false`
    }

    return null
  }

  const getScreenStyles = () => {
    const isPortrait = config?.screen.orientation === "portrait"
    return {
      backgroundColor: config?.screen.playlist?.background_color || "#000000",
      width: "100vw",
      height: "100vh",
      transform: isPortrait ? "rotate(90deg)" : "none",
      transformOrigin: "center center",
    }
  }

  const getMediaObjectFit = (mediaType: "image" | "video" | "document") => {
    const playlist = config?.screen.playlist
    if (!playlist) return "object-contain"

    let scaleValue = "fit"
    switch (mediaType) {
      case "image":
        scaleValue = playlist.scale_image || "fit"
        break
      case "video":
        scaleValue = playlist.scale_video || "fit"
        break
      case "document":
        scaleValue = playlist.scale_document || "fit"
        break
    }

    switch (scaleValue) {
      case "fill":
        return "object-cover"
      case "stretch":
        return "object-fill"
      case "center":
        return "object-none"
      case "fit":
      default:
        return "object-contain"
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isTVMode) return

    const threshold = 50 // pixels from edge to trigger
    const windowWidth = window.innerWidth
    const leftPanelWidth = 256 // w-64 = 16rem = 256px
    const rightPanelWidth = 384 // w-96 = 24rem = 384px

    // Left edge detection - keep open if within panel width
    if (e.clientX < threshold) {
      setShowLeftPanel(true)
    } else if (e.clientX > leftPanelWidth) {
      setShowLeftPanel(false)
    }

    // Right edge detection - keep open if within panel width
    if (e.clientX > windowWidth - threshold) {
      setShowRightPanel(true)
    } else if (e.clientX < windowWidth - rightPanelWidth) {
      setShowRightPanel(false)
    }
  }

  const setLastUpdatedAt = (updatedAt: string | null) => {
    lastUpdatedAtRef.current = updatedAt
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Loading Content</h2>
            <p className="text-muted-foreground">Fetching screen configuration...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-destructive">Connection Failed</h2>
            <p className="text-muted-foreground">Screen configuration not found</p>
            {error && <p className="text-sm text-muted-foreground">{error}</p>}
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
            <Button onClick={handleBackToSetup} variant="outline" className="w-full bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">No Configuration</h2>
            <p className="text-muted-foreground">Screen configuration not available</p>
            <Button onClick={handleBackToSetup} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showCameraSetup) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Camera Setup</h1>
            <Button onClick={() => setShowCameraSetup(false)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Player
            </Button>
          </div>

          <CameraSetup onCameraConfigured={handleCameraConfigured} />
        </div>
      </div>
    )
  }

  const { screen } = config
  const contentToDisplay = shuffledContent.length > 0 ? shuffledContent : screen.content || []
  const currentMedia = contentToDisplay[currentMediaIndex]

  console.log("[v0] Rendering player with:", {
    totalContent: contentToDisplay.length,
    currentIndex: currentMediaIndex,
    currentMedia: currentMedia
      ? {
          id: currentMedia.id,
          type: currentMedia.media?.type,
          name: currentMedia.media?.name,
        }
      : null,
  })

  console.log("[v0] Player page render - Analytics component conditions:", {
    hasScreenId: !!config?.screen.id,
    analyticsEnabled,
    screenId: config?.screen.id,
    willRenderAnalytics: !!(config?.screen.id && analyticsEnabled),
  })

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden ${isTVMode ? "tv-mode" : ""}`}
      style={{
        backgroundColor: config?.screen.playlist?.background_color || "#000000",
        cursor: isTVMode ? "none" : "default",
      }}
      onMouseMove={handleMouseMove}
    >
      {pendingUpdate && updateProgress > 0 && (
        <div className="fixed top-2 right-2 text-[10px] text-white/40 font-mono z-50">
          {Math.round(updateProgress)}%
        </div>
      )}

      {isTVMode && (
        <div className="absolute top-4 right-4 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium z-50">
          TV Mode
        </div>
      )}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-black/80 backdrop-blur-sm border-r border-white/20 z-50 transition-transform duration-300 ease-in-out ${
          showLeftPanel ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 space-y-4">
          <Button
            onClick={() => setShowCameraSetup(true)}
            variant="secondary"
            className="w-full bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 tv-focusable tv-button"
            autoFocus={showLeftPanel}
          >
            <Settings className="w-4 h-4 mr-2" />
            Camera Setup
          </Button>
        </div>
      </div>
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-black/80 backdrop-blur-sm border-l border-white/20 z-50 transition-transform duration-300 ease-in-out ${
          showRightPanel ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 h-full overflow-y-auto">
          {config?.screen.id && analyticsEnabled && (
            <>
              {console.log("[v0] Rendering CameraAnalytics in right panel with screenId:", config.screen.id)}
              <CameraAnalytics
                screenId={config.screen.id}
                enabled={analyticsEnabled}
                onToggle={setAnalyticsEnabled}
                onSetupClick={() => setShowCameraSetup(true)}
                className="bg-transparent border-0"
              />
            </>
          )}
        </div>
      </div>
      {contentToDisplay && contentToDisplay.length > 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          {currentMedia && (
            <div className="w-full h-full relative">
              {currentMedia.media.mime_type.startsWith("image/") ? (
                <Image
                  src={getMediaUrl(currentMedia.media.file_path) || "/placeholder.svg"}
                  alt={currentMedia.media.name}
                  fill
                  className={getMediaObjectFit("image")}
                  priority
                  unoptimized
                />
              ) : isYouTubeVideo(currentMedia.media) ? (
                <iframe
                  key={currentMedia.id}
                  src={getYouTubeUrlWithAutoplay(currentMedia.media.file_path)}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  title={currentMedia.media.name}
                />
              ) : currentMedia.media.mime_type.startsWith("video/") ? (
                <video
                  src={getMediaUrl(currentMedia.media.file_path)}
                  className={`w-full h-full ${getMediaObjectFit("video")}`}
                  autoPlay
                  muted
                  playsInline
                  onEnded={() => {
                    setCurrentMediaIndex((prev) => {
                      const nextIndex = prev + 1
                      return nextIndex >= contentToDisplay.length ? 0 : nextIndex
                    })
                  }}
                />
              ) : isGoogleSlides(currentMedia.media) ? (
                <iframe
                  src={getGoogleSlidesEmbedUrl(currentMedia.media) || ""}
                  className="w-full h-full border-0"
                  allowFullScreen
                  title={currentMedia.media.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p className="text-2xl">{currentMedia.media.name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4 text-white">
          <h2 className="text-3xl font-bold">{screen.name}</h2>
          <p className="text-xl">No content assigned</p>
          <p className="text-muted-foreground">Waiting for content to be added to this screen</p>
        </div>
      )}
    </div>
  )
}
