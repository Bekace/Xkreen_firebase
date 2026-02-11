import { useEffect, useState } from "react"

export interface PlanLimits {
  planName: string
  screens: {
    current: number
    limit: number
    canCreate: boolean
  }
  playlists: {
    current: number
    limit: number
    canCreate: boolean
  }
  storage: {
    currentBytes: number
    limitBytes: number
    currentMB: number
    limitMB: number
    canUpload: boolean
    percentUsed: number
  }
  analyticsScreens: {
    current: number
    limit: number
    canEnable: boolean
  }
  teamMembers: {
    current: number
    limit: number
    canInvite: boolean
  }
  features: {
    youtubeVideos: boolean
    googleSlides: boolean
    scheduling: boolean
    locations: boolean
    analytics: boolean
    aiAnalytics: boolean
  }
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

  return { limits, loading, error, refresh: () => setLimits(null) }
}
