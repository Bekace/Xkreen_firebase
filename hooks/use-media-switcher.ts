"use client"

import { useState, useRef, useEffect } from "react"

type MediaType = "video" | "image" | "googleSlides" | "youtube"
type ActiveElement = "A" | "B"

export function useMediaSwitcher(currentIndex?: number) {
  const [activeElement, setActiveElement] = useState<ActiveElement>("A")
  
  // Reset activeElement to "A" when playlist loops back to start
  useEffect(() => {
    if (currentIndex === 0 && activeElement === "B") {
      console.log("[v0] Resetting activeElement to A on loop")
      setActiveElement("A")
    }
  }, [currentIndex, activeElement])

  // Refs for dual video elements
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)

  // Refs for dual iframe elements (Google Slides, YouTube)
  const iframeARef = useRef<HTMLIFrameElement>(null)
  const iframeBRef = useRef<HTMLIFrameElement>(null)

  const switchToNext = () => {
    console.log("[v0] Switching elements from", activeElement, "to", activeElement === "A" ? "B" : "A")
    setActiveElement((prev) => (prev === "A" ? "B" : "A"))
  }

  const getActiveVideoRef = () => {
    return activeElement === "A" ? videoARef : videoBRef
  }

  const getInactiveVideoRef = () => {
    return activeElement === "A" ? videoBRef : videoARef
  }

  const getActiveIframeRef = () => {
    return activeElement === "A" ? iframeARef : iframeBRef
  }

  const getInactiveIframeRef = () => {
    return activeElement === "A" ? iframeBRef : iframeARef
  }

  return {
    activeElement,
    switchToNext,
    videoARef,
    videoBRef,
    iframeARef,
    iframeBRef,
    getActiveVideoRef,
    getInactiveVideoRef,
    getActiveIframeRef,
    getInactiveIframeRef,
  }
}
