"use client"

import { useState, useEffect, useRef } from "react"

interface PreloadItem {
  index: number
  ready: boolean
  name: string
}

interface WebViewPreloaderConfig {
  content: any[]
  currentIndex: number
  getMediaUrl: (filePath: string) => string
  preloadCount?: number
}

export function useWebViewPreloader({ content, currentIndex, getMediaUrl, preloadCount = 3 }: WebViewPreloaderConfig) {
  const [preloadQueue, setPreloadQueue] = useState<Map<number, PreloadItem>>(new Map())
  const [preloadStatus, setPreloadStatus] = useState<string>("")
  const preloadingRef = useRef<Set<number>>(new Set())
  const previousIndexRef = useRef<number>(currentIndex)
  const failedItemsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (previousIndexRef.current > currentIndex && currentIndex === 0 && content.length > 1) {
      console.log("[v0] Playlist restarted, clearing failed items only")
      failedItemsRef.current.clear()
      preloadingRef.current.clear()
      // Keep preloadQueue intact - successful items stay ready
    }
    previousIndexRef.current = currentIndex
  }, [currentIndex, content.length])

  // Preload multiple items ahead
  useEffect(() => {
    if (!content || content.length === 0) return

    const itemsToPreload: number[] = []

    // Calculate next N items to preload
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = (currentIndex + i) % content.length
      if (
        !preloadQueue.has(nextIndex) &&
        !preloadingRef.current.has(nextIndex) &&
        !failedItemsRef.current.has(nextIndex)
      ) {
        itemsToPreload.push(nextIndex)
      }
    }

    if (itemsToPreload.length === 0) {
      console.log("[v0] All next items already preloaded. Queue size:", preloadQueue.size)
    }

    // Preload each item
    itemsToPreload.forEach((index) => {
      preloadMedia(content[index], index)
    })
  }, [currentIndex, content, preloadCount])

  const preloadMedia = async (mediaItem: any, index: number) => {
    if (!mediaItem?.media?.file_path) return

    const mediaName = mediaItem.media.name || "Unknown"
    const mediaType = mediaItem.media.type

    preloadingRef.current.add(index)
    setPreloadStatus(`Preloading: ${mediaName}`)
    console.log("[v0] Starting preload for index", index, mediaName)

    const timeout = 30000 // 30 seconds for Android WebView

    try {
      if (mediaType === "image") {
        await preloadImage(getMediaUrl(mediaItem.media.file_path), timeout)
      } else if (mediaType === "video") {
        await preloadVideo(getMediaUrl(mediaItem.media.file_path), timeout)
      }

      setPreloadQueue((prev) => {
        const newQueue = new Map(prev)
        newQueue.set(index, { index, ready: true, name: mediaName })
        return newQueue
      })
      setPreloadStatus(`Ready: ${mediaName}`)
      console.log("[v0] ✓ Preload SUCCESS for index", index, "- Item will stay ready")
    } catch (error) {
      console.log("[v0] ✗ Preload FAILED for index", index, error)
      failedItemsRef.current.add(index)
      setPreloadStatus(`Timeout: ${mediaName}`)
    } finally {
      preloadingRef.current.delete(index)
    }
  }

  const preloadImage = (url: string, timeout: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.crossOrigin = "anonymous"

      const timeoutId = setTimeout(() => {
        img.src = ""
        reject(new Error("Timeout"))
      }, timeout)

      img.onload = () => {
        clearTimeout(timeoutId)
        // Use decode() for better WebView compatibility
        img
          .decode()
          .then(() => resolve())
          .catch(() => resolve()) // Still resolve if decode fails
      }

      img.onerror = () => {
        clearTimeout(timeoutId)
        reject(new Error("Load failed"))
      }

      img.src = url
    })
  }

  const preloadVideo = (url: string, timeout: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video")
      video.crossOrigin = "anonymous"
      video.preload = "auto"
      video.muted = true

      const timeoutId = setTimeout(() => {
        video.src = ""
        reject(new Error("Timeout"))
      }, timeout)

      video.onloadeddata = () => {
        clearTimeout(timeoutId)
        // Force WebView to actually buffer by attempting play then pause
        video
          .play()
          .then(() => {
            video.pause()
            resolve()
          })
          .catch(() => resolve()) // Still resolve if play fails
      }

      video.onerror = () => {
        clearTimeout(timeoutId)
        reject(new Error("Load failed"))
      }

      video.src = url
    })
  }

  const isReady = (index: number): boolean => {
    return preloadQueue.get(index)?.ready || false
  }

  const getNextReadyIndex = (fromIndex: number): number | null => {
    for (let i = 1; i < content.length; i++) {
      const checkIndex = (fromIndex + i) % content.length
      if (isReady(checkIndex)) {
        return checkIndex
      }
    }
    return null
  }

  return {
    preloadQueue,
    preloadStatus,
    isReady,
    getNextReadyIndex,
  }
}
