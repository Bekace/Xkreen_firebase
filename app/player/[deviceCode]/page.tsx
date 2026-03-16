"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import { useMediaSwitcher } from "@/hooks/use-media-switcher"
import { useMediaPreloader } from "@/hooks/use-media-preloader"
import { usePlaylistTimer } from "@/hooks/use-playlist-timer"
import YouTubePlayerWithFallback from "@/components/youtube-player-with-fallback"
import { trackEvent } from "@/lib/analytics";
import "@/components/ui/spinner.css"

// ... (Las interfaces y funciones de ayuda iniciales no cambian) ...
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
    media_type: string
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
      shuffle_content?: boolean
    } | null
    updated_at: string
  }
}

const getMediaUrl = (filePath: string) => {
  if (!filePath) return "/placeholder.svg"
  if (filePath.startsWith("http")) return filePath
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

const isRegularVideo = (media: MediaItem["media"]) => {
  return media.mime_type.startsWith("video/") && !isYouTubeVideo(media)
}

const getMediaObjectFit = (mediaType: "image" | "video" | "document", playlist: any) => {
  if (!playlist) return "object-contain"
  let scaleValue = "fit"
  switch (mediaType) {
    case "image": scaleValue = playlist.scale_image || "fit"; break;
    case "video": scaleValue = playlist.scale_video || "fit"; break;
    case "document": scaleValue = playlist.scale_document || "fit"; break;
  }
  switch (scaleValue) {
    case "fill": return "object-cover";
    case "stretch": return "object-fill";
    case "center": return "object-none";
    case "fit": default: return "object-contain";
  }
}

export default function PlayerPage() {
  const params = useParams()
  const deviceCode = params.deviceCode as string;
  const [config, setConfig] = useState<ScreenConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [shuffledContent, setShuffledContent] = useState<MediaItem[]>([])
  const router = useRouter()
  
  const {
    activeElement,
    switchToNext,
    videoARef,
    videoBRef,
    iframeARef,
    iframeBRef,
    getInactiveVideoRef,
    getInactiveIframeRef,
  } = useMediaSwitcher()

  const contentToDisplay = shuffledContent.length > 0 ? shuffledContent : config?.screen?.content || []
  const currentMedia = contentToDisplay?.[currentIndex]
  const currentPlaylist = config?.screen?.playlist

  const advanceToNext = useCallback(() => {
    if (!contentToDisplay || contentToDisplay.length === 0 || !currentMedia) return
    
    // Track the end of the current media item *before* advancing
    console.log(`[Analytics] Universal media_end for ${currentMedia.media.id}`);
    trackEvent(deviceCode, 'media_end', currentMedia, currentPlaylist);

    const nextIndex = (currentIndex + 1) % contentToDisplay.length;
    setCurrentIndex(nextIndex)
    switchToNext()
  }, [currentIndex, contentToDisplay, switchToNext, currentMedia, deviceCode, currentPlaylist])

  const { preloadStatus } = useMediaPreloader(
    contentToDisplay,
    currentIndex,
    getInactiveVideoRef(),
    getInactiveIframeRef(),
  )

  usePlaylistTimer(contentToDisplay, currentIndex, advanceToNext)

  // Universal media_start tracking
  useEffect(() => {
    if (currentMedia && deviceCode) {
      console.log(`[Analytics] Universal media_start for ${currentMedia.media.id}`);
      trackEvent(deviceCode, 'media_start', currentMedia, currentPlaylist);
    }
  }, [currentMedia, deviceCode, currentPlaylist]);

  useEffect(() => {
    const fetchConfigAndSendHeartbeat = async () => {
      if (!deviceCode) return;
      try {
        setLoading(true)
        // Fetch config
        const response = await fetch(`/api/devices/config/${deviceCode}`)
        if (!response.ok) {
          if (response.status === 404) router.push(`/player?error=device-not-found`);
          throw new Error("Failed to fetch configuration")
        }
        const data = await response.json()
        setConfig(data)
        const content = data.content || [];
        setShuffledContent(
          data.screen?.playlist?.shuffle_content ? [...content].sort(() => Math.random() - 0.5) : content
        );
        
        // Send heartbeat
        await fetch('/api/devices/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_code: deviceCode }),
        });

        trackEvent(deviceCode, 'screen_online', {}, {});
        setError(null)
      } catch (err) {
        console.error("[v0] Error fetching config or sending heartbeat:", err)
        setError("Failed to load screen configuration")
      } finally {
        setLoading(false)
      }
    }
    fetchConfigAndSendHeartbeat()
    const interval = setInterval(fetchConfigAndSendHeartbeat, 30000)
    return () => clearInterval(interval)
  }, [deviceCode, router])

  const safeContent = currentMedia && currentMedia.media;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ backgroundColor: currentPlaylist?.background_color || "#000000" }}
    >
      {safeContent ? (
        <div className="w-full h-full flex items-center justify-center">
          {isRegularVideo(currentMedia.media) && (
            <video
              key={currentMedia.media.id}
              className={`absolute inset-0 w-full h-full ${getMediaObjectFit("video", currentPlaylist)}`}
              src={currentMedia.media.file_path}
              autoPlay muted playsInline
              onEnded={advanceToNext}
              onError={() => trackEvent(deviceCode, 'media_error', currentMedia, currentPlaylist, { error_source: 'html5_video' })}
            />
          )}

          {isYouTubeVideo(currentMedia.media) && (
            <>
              <YouTubePlayerWithFallback
                ref={iframeARef}
                videoUrl={currentMedia.media.file_path}
                isActive={activeElement === "A"}
                onVideoEnd={advanceToNext}
                media={currentMedia}
                playlist={currentPlaylist}
                className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${activeElement === "A" ? "opacity-100 z-10" : "opacity-0 z-0"}`}
              />
              <YouTubePlayerWithFallback
                ref={iframeBRef}
                videoUrl={contentToDisplay[(currentIndex + 1) % contentToDisplay.length]?.media.file_path}
                isActive={activeElement === "B"}
                onVideoEnd={advanceToNext}
                media={contentToDisplay[(currentIndex + 1) % contentToDisplay.length]}
                playlist={currentPlaylist}
                className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${activeElement === "B" ? "opacity-100 z-10" : "opacity-0 z-0"}`}
              />
            </>
          )}

          {isGoogleSlides(currentMedia.media) && (
            <>
              <iframe
                ref={iframeARef}
                className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${activeElement === "A" ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                title={currentMedia.media.name}
                src={currentMedia.media.file_path}
              />
              <iframe
                ref={iframeBRef}
                className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${activeElement === "B" ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                title={currentMedia.media.name}
                src={currentMedia.media.file_path}
              />
            </>
          )}
          {currentMedia.media.mime_type.startsWith("image/") && (
            <Image
                key={currentMedia.id}
                src={getMediaUrl(currentMedia.media.file_path) || "/placeholder.svg"}
                alt={currentMedia.media.name}
                fill
                className={getMediaObjectFit("image", config?.screen?.playlist)}
                priority
                unoptimized
              />
          )}
        </div>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0a2a3a] text-white">
          <div className="text-center space-y-4">
            {loading ? (
              <>
                <div className="spinner"></div>
                <h2 className="text-3xl font-light">Loading Screen...</h2>
              </>
            ) : (
              <>
                <div className="text-6xl">📺</div>
                <h2 className="text-3xl font-light">No content assigned</h2>
                <p className="text-xl text-gray-400">Assign content to this screen in your dashboard</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
