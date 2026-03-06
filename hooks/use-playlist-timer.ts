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
      setTimeRemaining(getDuration(currentMedia))
    }
  }, [currentMedia, getDuration])

  // Countdown timer for images and iframes
  useEffect(() => {
    if (!isPlaying || !currentMedia) return

    // Videos handle their own advancement via onEnded
    const isRegularVideo =
      currentMedia.media.mime_type.startsWith("video/") && !currentMedia.media.mime_type.includes("youtube")

    if (isRegularVideo) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onAdvance()
          return getDuration(currentMedia)
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isPlaying, currentMedia, onAdvance, getDuration])

  return {
    timeRemaining,
    isPlaying,
    setIsPlaying,
  }
}
