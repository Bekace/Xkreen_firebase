"use client"

import { useEffect, useRef, useState } from "react"

export interface TVNavigationOptions {
  onUp?: () => void
  onDown?: () => void
  onLeft?: () => void
  onRight?: () => void
  onSelect?: () => void
  onBack?: () => void
  onMenu?: () => void
  enabled?: boolean
  trapFocus?: boolean
}

/**
 * Custom hook for Fire TV / Android TV remote control navigation
 * Handles D-Pad (arrow keys) and action buttons (Enter, Escape, Menu)
 */
export function useTVNavigation(options: TVNavigationOptions = {}) {
  const { onUp, onDown, onLeft, onRight, onSelect, onBack, onMenu, enabled = true, trapFocus = false } = options

  const [isTVMode, setIsTVMode] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const detectTVMode = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isTVDevice =
        userAgent.includes("aftb") || // Fire TV
        userAgent.includes("aftm") || // Fire TV Stick
        userAgent.includes("afts") || // Fire TV Stick 4K
        userAgent.includes("aftt") || // Fire TV Cube
        userAgent.includes("tv") ||
        userAgent.includes("smarttv") ||
        window.location.search.includes("tv=true") // Manual override for testing

      setIsTVMode(isTVDevice)
      return isTVDevice
    }

    const isTV = detectTVMode()
    console.log("[v0] TV Mode detected:", isTV)

    const handleKeyDown = (event: KeyboardEvent) => {
      // Fire TV remote key codes
      const key = event.key
      const keyCode = event.keyCode

      console.log("[v0] TV Navigation - Key pressed:", key, "KeyCode:", keyCode)

      switch (key) {
        case "ArrowUp":
          event.preventDefault()
          onUp?.()
          break
        case "ArrowDown":
          event.preventDefault()
          onDown?.()
          break
        case "ArrowLeft":
          event.preventDefault()
          onLeft?.()
          break
        case "ArrowRight":
          event.preventDefault()
          onRight?.()
          break
        case "Enter":
          event.preventDefault()
          onSelect?.()
          break
        case "Escape":
        case "Backspace": // Fire TV back button
          event.preventDefault()
          onBack?.()
          break
        case "m":
        case "M":
        case "ContextMenu": // Menu button on some remotes
          event.preventDefault()
          onMenu?.()
          break
      }

      if (keyCode === 82) {
        // Menu button
        event.preventDefault()
        onMenu?.()
      } else if (keyCode === 4) {
        // Back button
        event.preventDefault()
        onBack?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [enabled, onUp, onDown, onLeft, onRight, onSelect, onBack, onMenu])

  return { isTVMode }
}

/**
 * Hook for managing focus on a specific element with TV navigation
 */
export function useTVFocus(autoFocus = false) {
  const ref = useRef<HTMLElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
    }
  }, [autoFocus])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleFocus = () => setIsFocused(true)
    const handleBlur = () => setIsFocused(false)

    element.addEventListener("focus", handleFocus)
    element.addEventListener("blur", handleBlur)

    return () => {
      element.removeEventListener("focus", handleFocus)
      element.removeEventListener("blur", handleBlur)
    }
  }, [])

  return { ref, isFocused }
}
