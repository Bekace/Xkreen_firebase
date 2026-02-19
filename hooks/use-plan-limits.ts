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

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/plan-limits")

        if (!response.ok) {
          throw new Error("Failed to fetch plan limits")
        }

        const data = await response.json()
        setLimits(data)
        setError(null)
      } catch (err) {
        console.error("[v0] Error fetching plan limits:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchLimits()
  }, [])

  return {
    limits,
    loading,
    error,
    features: limits?.features || null,
    planName: limits?.planName || null,
    refresh: () => setLimits(null),
  }
}
