import { useState, useEffect, useCallback } from "react"
import { convertStorageToDisplayValue, formatBytes } from "@/lib/storage-utils"


interface UploadLimits {
  maxStorage: number // in bytes
  storageUnit: "MB" | "GB" | "TB"
  currentStorageBytes: number
  currentStorageFormatted: string
  remainingStorageFormatted: string
  isAtLimit: boolean
  canUpload: (fileSizeBytes: number) => boolean
  storageUsagePercentage: number
  isUnlimited: boolean
  maxFileSize: number // in bytes
  fileUploadUnit: "MB" | "GB" | "TB"
  maxFileSizeFormatted: string
  planName: string
}

export function useUploadLimits(): UploadLimits & {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const [limits, setLimits] = useState<UploadLimits>({
    maxStorage: 1073741824, // 1 GB
    storageUnit: "GB",
    currentStorageBytes: 0,
    currentStorageFormatted: "0 GB",
    remainingStorageFormatted: "1 GB",
    isAtLimit: false,
    canUpload: () => true,
    storageUsagePercentage: 0,
    isUnlimited: false,
    maxFileSize: 52428800, // 50 MB
    fileUploadUnit: "MB",
    maxFileSizeFormatted: "50 MB",
    planName: "Free",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUploadLimits = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/upload-limits")
      if (!response.ok) {
        throw new Error(`Failed to fetch upload limits: ${response.statusText}`)
      }
      const data = await response.json()

      const isUnlimited = data.maxStorage === -1
      const maxStorageBytes = isUnlimited ? Number.MAX_SAFE_INTEGER : Number(data.maxStorage) || 0
      const currentStorageBytes = Number(data.currentStorageBytes) || 0
      const storageUsagePercentage = isUnlimited ? 0 : (currentStorageBytes / maxStorageBytes) * 100
      const remainingBytes = Math.max(0, maxStorageBytes - currentStorageBytes)

      setLimits({
        maxStorage: maxStorageBytes,
        storageUnit: data.storageUnit || "GB",
        currentStorageBytes: currentStorageBytes,
        currentStorageFormatted: formatBytes(currentStorageBytes),
        remainingStorageFormatted: formatBytes(remainingBytes),
        isAtLimit: !isUnlimited && currentStorageBytes >= maxStorageBytes,
        canUpload: (fileSizeBytes: number) => {
          if (fileSizeBytes > data.maxFileSize) return false
          if (isUnlimited) return true
          return currentStorageBytes + fileSizeBytes <= maxStorageBytes
        },
        storageUsagePercentage: Math.min(100, storageUsagePercentage),
        isUnlimited,
        maxFileSize: data.maxFileSize || 0,
        fileUploadUnit: data.fileUploadUnit || "MB",
        maxFileSizeFormatted: formatBytes(data.maxFileSize || 0),
        planName: data.planName || "Free",
      })
      setError(null)
    } catch (err) {
      console.error("[v0] Error fetching upload limits:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUploadLimits()
  }, [fetchUploadLimits])

  const refresh = useCallback(async () => {
    await fetchUploadLimits()
  }, [fetchUploadLimits])

  return { ...limits, loading, error, refresh }
}
