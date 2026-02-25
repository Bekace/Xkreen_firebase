import { useEffect, useState } from "react"

export interface PlanFeatures {
  mediaLibrary: boolean
  playlists: boolean
  screens: boolean
  locations: boolean
  schedules: boolean
  analytics: boolean
  aiAnalytics: boolean
  teamMembers: boolean
  urlMedia: boolean
}

export interface PlanLimits {
  isSuperAdmin?: boolean
  planName: string
  limits: {
    maxScreens: number
    maxPlaylists: number
    maxMediaStorage: number
    maxLocations: number
    maxSchedules: number
    maxTeamMembers: number
  }
  usage: {
    screensUsed: number
    playlistsUsed: number
    storageUsed: number
  }
  features: PlanFeatures
}

export function usePlanLimits() {
  const [limits, setLimits] = useState<PlanLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLimits = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/plan-limits", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch plan limits")
      }

      const data = await response.json()
      console.log("[v0] Fetched plan limits, features:", data.features)
      setLimits(data)
      setError(null)
    } catch (err) {
      console.error("[v0] Error fetching plan limits:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLimits()
  }, [])

  return {
    limits,
    loading,
    error,
    features: limits?.features || null,
    planName: limits?.planName || null,
    refresh: () => {
      fetchLimits()
    },
  }
}
