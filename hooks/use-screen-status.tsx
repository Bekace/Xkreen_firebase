"use client"

import { useState, useEffect } from "react"

interface Screen {
  id: string
  name: string
  location: string
  resolution: string
  orientation: string
  screen_code: string
  status: "online" | "offline" | "paired" | "unpaired"
  last_seen: string | null
  created_at: string
  playlists?: { id: string; name: string }
}

export function useScreenStatus(refreshInterval = 30000) {
  const [screens, setScreens] = useState<Screen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScreens = async () => {
    try {
      const response = await fetch("/api/screens", {
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch screens")
      }

      const data = await response.json()
      setScreens(data.screens)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScreens()

    const interval = setInterval(fetchScreens, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const getOnlineCount = () => screens.filter((s) => s.status === "online").length
  const getPairedCount = () => screens.filter((s) => s.status === "paired").length
  const getOfflineCount = () => screens.filter((s) => s.status === "offline").length
  const getUnpairedCount = () => screens.filter((s) => s.status === "unpaired").length

  return {
    screens,
    loading,
    error,
    refreshScreens: fetchScreens,
    stats: {
      total: screens.length,
      online: getOnlineCount(),
      paired: getPairedCount(),
      offline: getOfflineCount(),
      unpaired: getUnpairedCount(),
    },
  }
}
