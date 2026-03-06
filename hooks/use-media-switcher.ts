"use client"

import { useState, useRef } from "react"

type MediaType = "video" | "image" | "googleSlides" | "youtube"
type ActiveElement = "A" | "B"

export function useMediaSwitcher() {
  const [activeElement, setActiveElement] = useState<ActiveElement>("A")

  // Refs for dual video elements
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)

  // Refs for dual iframe elements (Google Slides, YouTube)
  const iframeARef = useRef<HTMLIFrameElement>(null)
  const iframeBRef = useRef<HTMLIFrameElement>(null)

  const switchToNext = () => {
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
