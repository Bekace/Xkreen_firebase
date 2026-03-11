"use client"

import { useState, useEffect, useCallback } from "react"

interface UploadLimits {
  maxStorage: number
  storageUnit: string
  currentStorageBytes: number
  currentStorageFormatted: number
  remainingStorageFormatted: number
  isAtLimit: boolean
  canUpload: (fileSizeBytes: number) => boolean
  storageUsagePercentage: number
  isUnlimited: boolean
  maxFileSize: number
  planName: string
}

export function useUploadLimits(): UploadLimits & {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const [limits, setLimits] = useState<UploadLimits>({
    maxStorage: 100,
    storageUnit: "MB",
    currentStorageBytes: 0,
    currentStorageFormatted: 0,
    remainingStorageFormatted: 100,
    isAtLimit: false,
    canUpload: () => false,
    storageUsagePercentage: 0,
    isUnlimited: false,
    maxFileSize: 52428800,
    planName: "Free",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUploadLimits = useCallback(async () => {
    try {
      console.log("[v0] Fetching upload limits...")
      const response = await fetch("/api/upload-limits")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Upload limits response:", data)

        const isUnlimited = data.maxStorage === -1
        const storageUnit = data.storageUnit || "MB"
        const currentStorageBytes = data.currentStorageBytes || 0
        const maxStorageBytes = data.maxStorage
        const maxFileSize = data.maxFileSize || 52428800
        const planName = data.planName || "Free"

        const GB = 1024 * 1024 * 1024
        const currentStorageGB = currentStorageBytes / GB
        const conversionFactor = storageUnit.toUpperCase() === "GB" ? GB : 1024 * 1024;
        const maxStorageConverted = isUnlimited ? Number.MAX_SAFE_INTEGER : maxStorageBytes / conversionFactor;
        const currentStorageConverted = currentStorageBytes / conversionFactor;
        const maxStorageGB = maxStorageConverted
        const remainingStorageGB = isUnlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, maxStorageGB - currentStorageGB)
        const storageUsagePercentage = isUnlimited ? 0 : (currentStorageGB / maxStorageGB) * 100

        console.log("[v0] Calculated storage:", {
          currentStorageBytes,
          currentStorageGB,
          maxStorageBytes,
          maxStorageGB,
          storageUsagePercentage,
          maxFileSize,
          planName,
        })

        setLimits({
          maxStorage: maxStorageBytes,
          storageUnit: storageUnit,
          currentStorageBytes,
          currentStorageFormatted: currentStorageGB,
          remainingStorageFormatted: remainingStorageGB,
          isAtLimit: !isUnlimited && currentStorageBytes >= maxStorageBytes,
          canUpload: (fileSizeBytes: number) => {
            if (isUnlimited) return fileSizeBytes <= maxFileSize
            return fileSizeBytes <= maxFileSize && currentStorageBytes + fileSizeBytes <= maxStorageBytes
          },
          storageUsagePercentage: Math.min(100, storageUsagePercentage),
          isUnlimited,
          maxFileSize,
          planName,
        })
        setError(null)
      } else {
        console.error("[v0] Failed to fetch upload limits, status:", response.status)
        setError("Failed to fetch upload limits")
      }
    } catch (err) {
      console.error("[v0] Error fetching upload limits:", err)
      setError("Failed to fetch upload limits")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUploadLimits()
  }, [fetchUploadLimits])

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchUploadLimits()
  }, [fetchUploadLimits])

  return { ...limits, loading, error, refresh }
}
