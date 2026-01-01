"use client"

import { useEffect } from "react"

export function useRotationDiagnostic(
  currentIndex: number,
  contentLength: number,
  currentMediaType: string,
  currentMediaName: string,
) {
  useEffect(() => {
    console.log("[v0 DIAGNOSTIC] ========================================")
    console.log("[v0 DIAGNOSTIC] Current Index:", currentIndex)
    console.log("[v0 DIAGNOSTIC] Total Items:", contentLength)
    console.log("[v0 DIAGNOSTIC] Current Media Type:", currentMediaType)
    console.log("[v0 DIAGNOSTIC] Current Media Name:", currentMediaName)
    console.log("[v0 DIAGNOSTIC] ========================================")
  }, [currentIndex, contentLength, currentMediaType, currentMediaName])
}
