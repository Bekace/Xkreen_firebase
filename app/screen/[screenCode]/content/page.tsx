"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface MediaItem {
  id: string
  media: {
    id: string
    name: string
    file_path: string
    mime_type: string
  }
  duration_override?: number
}

interface ScreenConfig {
  id: string
  name: string
  orientation: string
  background_color?: string
  scale_image?: string
  scale_video?: string
  scale_document?: string
  shuffle?: boolean
  default_transition?: string
  content: MediaItem[]
}

export default function ScreenContentPlayer({
  screenCode,
}: {
  screenCode: string
}) {
  const [config, setConfig] = useState<ScreenConfig | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchScreenConfig()
  }, [screenCode]) // Use screenCode directly instead of params.screenCode

  const fetchScreenConfig = async () => {
    try {
      const response = await fetch(`/api/screens/config/${screenCode}`)
      if (!response.ok) {
        throw new Error("Screen configuration not found")
      }
      const data = await response.json()
      setConfig(data.screen)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load screen")
      setLoading(false)
    }
  }

  // Auto-advance logic
  useEffect(() => {
    if (!config?.content?.length) return

    const currentMedia = config.content[currentIndex]
    const duration = (currentMedia?.duration_override || 5) * 1000

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % config.content.length)
    }, duration)

    return () => clearTimeout(timer)
  }, [currentIndex, config])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading screen content...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!config?.content?.length) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{ backgroundColor: config?.background_color || "#000000" }}
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{config?.name || "Screen"}</h1>
          <p className="text-xl">No content assigned</p>
          <p className="text-gray-400 mt-2">Waiting for content to be added to this screen</p>
        </div>
      </div>
    )
  }

  const currentMedia = config.content[currentIndex]
  const isPortrait = config.orientation === "portrait"

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center relative ${isPortrait ? "rotate-90" : ""}`}
      style={{ backgroundColor: config.background_color || "#000000" }}
    >
      {/* Content counter */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-sm z-10">
        {currentIndex + 1}/{config.content.length}
      </div>

      {/* Media content */}
      <div className="w-full h-full flex items-center justify-center">
        {currentMedia.media.mime_type?.startsWith("image/") && (
          <div className="relative w-full h-full">
            <Image
              src={currentMedia.media.file_path || "/placeholder.svg"}
              alt={currentMedia.media.name}
              fill
              style={{
                objectFit:
                  config.scale_image === "fill"
                    ? "cover"
                    : config.scale_image === "stretch"
                      ? "fill"
                      : config.scale_image === "center"
                        ? "none"
                        : "contain",
              }}
              unoptimized
            />
          </div>
        )}

        {currentMedia.media.mime_type?.startsWith("video/") && (
          <video
            src={currentMedia.media.file_path}
            autoPlay
            muted
            playsInline
            className="w-full h-full"
            style={{
              objectFit:
                config.scale_video === "fill"
                  ? "cover"
                  : config.scale_video === "stretch"
                    ? "fill"
                    : config.scale_video === "center"
                      ? "none"
                      : "contain",
            }}
          />
        )}

        {(currentMedia.media.name?.includes("Google Slides") ||
          currentMedia.media.mime_type?.includes("presentation")) && (
          <iframe
            src={`https://docs.google.com/presentation/d/${currentMedia.media.file_path}/embed?start=false&loop=false&delayms=3000&rm=minimal&chrome=false`}
            className="w-full h-full border-0"
            allowFullScreen
          />
        )}
      </div>
    </div>
  )
}
