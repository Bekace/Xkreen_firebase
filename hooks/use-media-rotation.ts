"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface MediaRotationConfig {
  currentIndex: number
  contentLength: number
  currentMediaType?: string
  currentMediaDuration?: number
  onAdvance: (nextIndex: number) => void
}

export function useMediaRotation({
  currentIndex,
  contentLength,
  currentMediaType,
  currentMediaDuration,
  onAdvance,
}: MediaRotationConfig) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [previousIndex, setPreviousIndex] = useState<number | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Stable advance function that won't recreate on every render
  const advanceToNextMedia = useCallback(() => {
    if (contentLength === 0) return

    const nextIndex = (currentIndex + 1) % contentLength
    console.log("[v0] Advancing from index", currentIndex, "to", nextIndex)

    setPreviousIndex(currentIndex)
    setIsTransitioning(true)

    onAdvance(nextIndex)

    setTimeout(() => {
      setIsTransitioning(false)
      setPreviousIndex(null)
    }, 50)
  }, [currentIndex, contentLength, onAdvance])

  // Rotation timer for images and documents (not videos)
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    // Only set timer for non-video content
    if (currentMediaType === "video" || currentMediaType === "youtube") {
      console.log("[v0] Skipping timer for video content")
      return
    }

    // Use provided duration or default to 10 seconds
    const duration = currentMediaDuration || 10
    console.log("[v0] Setting rotation timer for", duration, "seconds")

    timerRef.current = setTimeout(() => {
      console.log("[v0] Timer expired, advancing media")
      advanceToNextMedia()
    }, duration * 1000)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [currentIndex, currentMediaType, currentMediaDuration, advanceToNextMedia])

  return {
    advanceToNextMedia,
    previousIndex,
    isTransitioning,
  }
}
