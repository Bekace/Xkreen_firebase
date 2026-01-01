"use client"

import { useState, useEffect, useRef } from "react"

interface Media {
  id: string
  media: {
    id: string
    name: string
    file_path: string
    type: string
  }
  duration_override?: number
}

interface PreloadStatus {
  itemId: string
  status: "loading" | "ready" | "failed"
  message: string
}

export function useSmartPreloader(
  content: Media[],
  currentIndex: number,
  enabled = false, // Feature flag
) {
  const [readyQueue, setReadyQueue] = useState<Set<number>>(new Set())
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus[]>([])
  const preloadTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())

  // Preload multiple items ahead (3 items)
  const preloadMultiple = (startIndex: number) => {
    if (!enabled || !content.length) return

    const itemsToPreload = [startIndex + 1, startIndex + 2, startIndex + 3].filter((idx) => idx < content.length)

    itemsToPreload.forEach((index) => {
      if (!readyQueue.has(index)) {
        preloadItem(index)
      }
    })
  }

  // Preload single item
  const preloadItem = (index: number) => {
    const item = content[index]
    if (!item) return

    const mediaType = item.media.type
    const mediaUrl = getMediaUrl(item.media.file_path)

    console.log(`[v0] Smart Preloader: Starting preload for item ${index}:`, item.media.name)

    setPreloadStatus((prev) => [
      ...prev.filter((p) => p.itemId !== item.id),
      { itemId: item.id, status: "loading", message: `Preloading: ${item.media.name}` },
    ])

    // Videos: Mark as ready immediately (WebView handles buffering)
    if (mediaType === "video") {
      console.log(`[v0] Smart Preloader: Video item ${index} marked ready (no preload needed)`)
      setReadyQueue((prev) => new Set(prev).add(index))
      setPreloadStatus((prev) => [
        ...prev.filter((p) => p.itemId !== item.id),
        { itemId: item.id, status: "ready", message: `Ready: ${item.media.name}` },
      ])
      return
    }

    // Images/Documents: Actually preload
    if (mediaType === "image") {
      const img = new Image()

      const timeout = setTimeout(() => {
        console.log(`[v0] Smart Preloader: Timeout for item ${index}`)
        // Don't add to ready queue - let it load on demand
        setPreloadStatus((prev) => [
          ...prev.filter((p) => p.itemId !== item.id),
          { itemId: item.id, status: "failed", message: `Timeout: ${item.media.name}` },
        ])
      }, 20000) // 20 second timeout

      preloadTimeoutsRef.current.set(index, timeout)

      img.onload = () => {
        clearTimeout(timeout)
        preloadTimeoutsRef.current.delete(index)
        console.log(`[v0] Smart Preloader: Item ${index} loaded successfully`)
        setReadyQueue((prev) => new Set(prev).add(index))
        setPreloadStatus((prev) => [
          ...prev.filter((p) => p.itemId !== item.id),
          { itemId: item.id, status: "ready", message: `Ready: ${item.media.name}` },
        ])
      }

      img.onerror = () => {
        clearTimeout(timeout)
        preloadTimeoutsRef.current.delete(index)
        console.log(`[v0] Smart Preloader: Failed to load item ${index}`)
        setPreloadStatus((prev) => [
          ...prev.filter((p) => p.itemId !== item.id),
          { itemId: item.id, status: "failed", message: `Failed: ${item.media.name}` },
        ])
      }

      img.src = mediaUrl
    }
  }

  // Helper to get media URL
  const getMediaUrl = (filePath: string) => {
    if (!filePath) return "/placeholder.svg"
    if (filePath.startsWith("http")) return filePath
    return filePath
  }

  // Trigger preload when index changes
  useEffect(() => {
    if (!enabled) return

    // Add current index to ready queue immediately
    setReadyQueue((prev) => new Set(prev).add(currentIndex))

    // Preload next items
    preloadMultiple(currentIndex)
  }, [currentIndex, enabled, content])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      preloadTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
      preloadTimeoutsRef.current.clear()
    }
  }, [])

  return {
    readyQueue,
    preloadStatus,
    isReady: (index: number) => readyQueue.has(index),
  }
}
