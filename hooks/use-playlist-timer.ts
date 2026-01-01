"use client"

import { useState, useEffect, useCallback } from "react"

interface MediaItem {
  id: string
  duration_override: number | null
  media: {
    duration: number | null
    mime_type: string
  }
}

export function usePlaylistTimer(contentList: MediaItem[], currentIndex: number, onAdvance: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(10)
  const [isPlaying, setIsPlaying] = useState(true)

  const currentMedia = contentList[currentIndex]

  // Get duration for current media
  const getDuration = useCallback((media: MediaItem) => {
    return media.duration_override || media.media.duration || 10
  }, [])

  // Reset timer when media changes
  useEffect(() => {
    if (currentMedia) {
      const duration = getDuration(currentMedia)
      console.log("[v0] Timer reset for:", currentMedia.media.mime_type, "duration:", duration)
      setTimeRemaining(duration)
    }
  }, [currentMedia, getDuration])

  // Stabilize onAdvance reference
  const stableOnAdvance = useCallback(onAdvance, [])

  // Countdown timer for images and iframes
  useEffect(() => {
    if (!isPlaying || !currentMedia) return

    // Videos handle their own advancement via onEnded
    const isRegularVideo =
      currentMedia.media.mime_type.startsWith("video/") && !currentMedia.media.mime_type.includes("youtube")

    if (isRegularVideo) {
      console.log("[v0] Skipping timer for video, using onEnded")
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          console.log("[v0] Timer expired, advancing")
          stableOnAdvance()
          return getDuration(currentMedia)
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isPlaying, currentMedia, stableOnAdvance, getDuration])

  return {
    timeRemaining,
    isPlaying,
    setIsPlaying,
  }
}
