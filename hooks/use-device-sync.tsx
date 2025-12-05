"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface ScreenConfig {
  id: string
  name: string
  orientation: string
  contentType: string
  contentId: string
  playlistId: string
  playlist?: {
    id: string
    name: string
    backgroundColor: string
  }
}

interface PlaylistContent {
  playlist: {
    id: string
    name: string
    backgroundColor: string
    media: Array<{
      id: string
      filename: string
      fileUrl: string
      fileType: string
      duration: number
      transitionType: string
      transitionDuration: number
    }>
  }
}

interface SyncState {
  screenConfig: ScreenConfig | null
  playlistContent: PlaylistContent | null
  isLoading: boolean
  isOnline: boolean
  error: string
  lastSync: Date | null
  configVersion: string | null
}

interface UseSyncOptions {
  screenCode: string
  syncInterval?: number
  heartbeatInterval?: number
  retryDelay?: number
  maxRetries?: number
}

export function useDeviceSync({
  screenCode,
  syncInterval = 30000,
  heartbeatInterval = 10000,
  retryDelay = 5000,
  maxRetries = 3,
}: UseSyncOptions) {
  const [state, setState] = useState<SyncState>({
    screenConfig: null,
    playlistContent: null,
    isLoading: true,
    isOnline: true,
    error: "",
    lastSync: null,
    configVersion: null,
  })

  const retryCountRef = useRef(0)
  const syncIntervalRef = useRef<NodeJS.Timeout>()
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  const fetchScreenConfig = useCallback(
    async (forceUpdate = false) => {
      try {
        const response = await fetch(`/api/devices/config/${screenCode}`, {
          headers: {
            "Cache-Control": "no-cache",
            ...(state.configVersion && !forceUpdate ? { "If-None-Match": state.configVersion } : {}),
          },
        })

        // If 304 Not Modified, configuration hasn't changed
        if (response.status === 304) {
          setState((prev) => ({ ...prev, lastSync: new Date(), isOnline: true }))
          return
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch screen configuration")
        }

        const newConfigVersion = response.headers.get("etag") || Date.now().toString()
        const hasConfigChanged = state.configVersion !== newConfigVersion

        setState((prev) => ({
          ...prev,
          screenConfig: data.screen,
          isOnline: true,
          error: "",
          lastSync: new Date(),
          configVersion: newConfigVersion,
        }))

        // Only fetch playlist content if configuration changed or forced
        if ((hasConfigChanged || forceUpdate) && data.screen.playlistId) {
          await fetchPlaylistContent(data.screen.playlistId)
        }

        retryCountRef.current = 0 // Reset retry count on success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Connection failed"

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isOnline: false,
        }))

        // Implement exponential backoff retry
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1)

          retryTimeoutRef.current = setTimeout(() => {
            fetchScreenConfig(forceUpdate)
          }, delay)
        }
      }
    },
    [screenCode, state.configVersion, retryDelay, maxRetries],
  )

  const fetchPlaylistContent = useCallback(async (playlistId: string) => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/content`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch playlist content")
      }

      setState((prev) => ({
        ...prev,
        playlistContent: data,
      }))
    } catch (err) {
      console.error("Failed to fetch playlist content:", err)
      // Don't update error state for playlist content failures
      // as screen config is more critical
    }
  }, [])

  const sendHeartbeat = useCallback(async () => {
    try {
      const response = await fetch(`/api/devices/heartbeat/${screenCode}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          configVersion: state.configVersion,
        }),
      })

      if (response.ok) {
        setState((prev) => ({ ...prev, isOnline: true }))

        // Check if server indicates config update needed
        const data = await response.json()
        if (data.configUpdateRequired) {
          fetchScreenConfig(true)
        }
      }
    } catch (err) {
      console.error("Heartbeat failed:", err)
      setState((prev) => ({ ...prev, isOnline: false }))
    }
  }, [screenCode, state.configVersion, fetchScreenConfig])

  const refreshConfig = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true }))
    fetchScreenConfig(true).finally(() => {
      setState((prev) => ({ ...prev, isLoading: false }))
    })
  }, [fetchScreenConfig])

  useEffect(() => {
    const init = async () => {
      setState((prev) => ({ ...prev, isLoading: true }))
      await fetchScreenConfig(true)
      setState((prev) => ({ ...prev, isLoading: false }))
    }

    init()

    // Set up periodic sync and heartbeat
    syncIntervalRef.current = setInterval(() => fetchScreenConfig(), syncInterval)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, heartbeatInterval)

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [screenCode, fetchScreenConfig, sendHeartbeat, syncInterval, heartbeatInterval])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause sync when tab is hidden
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
      } else {
        // Resume sync when tab becomes visible
        fetchScreenConfig()
        syncIntervalRef.current = setInterval(() => fetchScreenConfig(), syncInterval)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [fetchScreenConfig, syncInterval])

  return {
    ...state,
    refreshConfig,
    retryCount: retryCountRef.current,
  }
}
