"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

interface MediaItem {
  id: string
  media: {
    id: string
    name: string
    file_path: string
    mime_type: string
    media_type: string
  }
}

interface PreloadResult {
  success: boolean
  message: string
}

export function useMediaPreloader(
  contentList: MediaItem[],
  currentIndex: number,
  videoARef: React.RefObject<HTMLVideoElement>,
  videoBRef: React.RefObject<HTMLVideoElement>,
  iframeARef: React.RefObject<HTMLIFrameElement>,
  iframeBRef: React.RefObject<HTMLIFrameElement>,
) {
  const [preloadStatus, setPreloadStatus] = useState<string>("")
  const preloadedIndices = useRef<Set<number>>(new Set())
  const isPreloading = useRef(false)

  console.log("[v0] useMediaPreloader called with:", {
    contentListLength: contentList.length,
    currentIndex,
    videoARref: !!videoARef.current,
    videoBRef: !!videoBRef.current,
  })

  const isVideo = (media: MediaItem["media"]) => {
    return (
      media.mime_type.startsWith("video/") &&
      !media.file_path.includes("youtube.com") &&
      !media.file_path.includes("youtu.be")
    )
  }

  const isImage = (media: MediaItem["media"]) => {
    return media.mime_type.startsWith("image/")
  }

  const isGoogleSlides = (media: MediaItem["media"]) => {
    return (
      media.mime_type === "application/vnd.google-apps.presentation" ||
      media.file_path.includes("docs.google.com/presentation")
    )
  }

  const isYouTube = (media: MediaItem["media"]) => {
    return (
      media.mime_type === "video/youtube" ||
      media.file_path.includes("youtube.com") ||
      media.file_path.includes("youtu.be")
    )
  }

  const preloadVideo = async (media: MediaItem["media"], videoElement: HTMLVideoElement): Promise<PreloadResult> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log("[v0] Video preload timeout:", media.name)
        resolve({ success: false, message: `Timeout: ${media.name}` })
      }, 30000)

      const onCanPlay = () => {
        clearTimeout(timeout)
        videoElement.removeEventListener("canplaythrough", onCanPlay)
        console.log("[v0] Video preloaded:", media.name)
        resolve({ success: true, message: `Ready: ${media.name}` })
      }

      videoElement.addEventListener("canplaythrough", onCanPlay)
      videoElement.preload = "auto"
      videoElement.src = media.file_path
      videoElement.load()
    })
  }

  const preloadImage = async (media: MediaItem["media"]): Promise<PreloadResult> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log("[v0] Image preload timeout:", media.name)
        resolve({ success: false, message: `Timeout: ${media.name}` })
      }, 30000)

      const img = new Image()
      img.onload = () => {
        clearTimeout(timeout)
        console.log("[v0] Image preloaded:", media.name)
        resolve({ success: true, message: `Ready: ${media.name}` })
      }
      img.onerror = () => {
        clearTimeout(timeout)
        console.error("[v0] Image preload failed:", media.name)
        resolve({ success: false, message: `Failed: ${media.name}` })
      }
      img.src = media.file_path
    })
  }

  const preloadIframe = async (media: MediaItem["media"], iframeElement: HTMLIFrameElement): Promise<PreloadResult> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log("[v0] Iframe preload timeout:", media.name)
        resolve({ success: false, message: `Timeout: ${media.name}` })
      }, 30000)

      const onLoad = () => {
        clearTimeout(timeout)
        iframeElement.removeEventListener("load", onLoad)
        console.log("[v0] Iframe preloaded:", media.name)
        resolve({ success: true, message: `Ready: ${media.name}` })
      }

      iframeElement.addEventListener("load", onLoad)
      iframeElement.src = media.file_path
    })
  }

  useEffect(() => {
    if (contentList.length === 0) return
    if (isPreloading.current) return

    const nextIndex = (currentIndex + 1) % contentList.length

    // Don't preload if already preloaded
    if (preloadedIndices.current.has(nextIndex)) {
      console.log("[v0] Item already preloaded, skipping:", nextIndex)
      return
    }

    const nextMedia = contentList[nextIndex]
    if (!nextMedia) return

    const preloadNext = async () => {
      isPreloading.current = true
      setPreloadStatus(`Preloading: ${nextMedia.media.name}`)

      let result: PreloadResult

      if (isVideo(nextMedia.media) && videoBRef.current) {
        result = await preloadVideo(nextMedia.media, videoBRef.current)
      } else if (isImage(nextMedia.media)) {
        result = await preloadImage(nextMedia.media)
      } else if ((isGoogleSlides(nextMedia.media) || isYouTube(nextMedia.media)) && iframeBRef.current) {
        result = await preloadIframe(nextMedia.media, iframeBRef.current)
      } else {
        result = { success: true, message: `Ready: ${nextMedia.media.name}` }
      }

      setPreloadStatus(result.message)

      // Mark as preloaded regardless of success (graceful degradation)
      preloadedIndices.current.add(nextIndex)
      isPreloading.current = false
    }

    preloadNext()
  }, [currentIndex, contentList, videoARef, videoBRef, iframeARef, iframeBRef])

  // Clear preloaded indices when playlist loops back to start
  useEffect(() => {
    if (currentIndex === 0 && preloadedIndices.current.size > 0) {
      console.log("[v0] ⚠️  PLAYLIST LOOPED DETECTED - Clearing cache and refs", {
        preloadedCount: preloadedIndices.current.size,
        videoAHasContent: !!videoARef.current?.src,
        videoBHasContent: !!videoBRef.current?.src,
      })
      preloadedIndices.current.clear()
      
      // Clear ALL refs to ensure clean state when looping
      if (videoARef.current) {
        console.log("[v0] Clearing videoARef")
        videoARef.current.src = ""
        videoARef.current.load()
      }
      if (videoBRef.current) {
        console.log("[v0] Clearing videoBRef")
        videoBRef.current.src = ""
        videoBRef.current.load()
      }
      if (iframeARef.current) {
        console.log("[v0] Clearing iframeARef")
        iframeARef.current.src = ""
      }
      if (iframeBRef.current) {
        console.log("[v0] Clearing iframeBRef")
        iframeBRef.current.src = ""
      }
    }
  }, [currentIndex, videoARef, videoBRef, iframeARef, iframeBRef])

  return { preloadStatus }
}
