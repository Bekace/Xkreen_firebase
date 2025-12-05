"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"

interface Screen {
  id: string
  name: string
  location: string
}

interface PlaylistItem {
  id: string
  media_url: string
  media_type: "image" | "video"
  duration: number
  position: number
}

interface ScreenConfig {
  screen: {
    id: string
    name: string
    location: string
    background_color: string
  }
  playlist: {
    id: string
    name: string
    background_color: string
  }
  items: PlaylistItem[]
}

export default function TestPlayerPage() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [selectedScreenId, setSelectedScreenId] = useState<string>("")
  const [config, setConfig] = useState<ScreenConfig | null>(null)
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all screens
  useEffect(() => {
    fetchScreens()
  }, [])

  const fetchScreens = async () => {
    try {
      const response = await fetch("/api/screens/list")
      if (response.ok) {
        const data = await response.json()
        setScreens(data.screens || [])
      }
    } catch (error) {
      console.error("Failed to fetch screens:", error)
    }
  }

  const loadScreenContent = async (screenId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/screens/${screenId}/config`)
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        setCurrentItemIndex(0)
      } else {
        setError("Failed to load screen content")
      }
    } catch (error) {
      setError("Error loading screen content")
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-advance media items
  useEffect(() => {
    if (!config?.items.length) return

    const currentItem = config.items[currentItemIndex]
    if (!currentItem) return

    const timer = setTimeout(() => {
      setCurrentItemIndex((prev) => (prev + 1) % config.items.length)
    }, currentItem.duration * 1000)

    return () => clearTimeout(timer)
  }, [config, currentItemIndex])

  const handleScreenSelect = (screenId: string) => {
    setSelectedScreenId(screenId)
    loadScreenContent(screenId)
  }

  const currentItem = config?.items[currentItemIndex]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Screen Content Test Player</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Screen to Test:</label>
              <Select value={selectedScreenId} onValueChange={handleScreenSelect}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Choose a screen..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {screens.map((screen) => (
                    <SelectItem key={screen.id} value={screen.id} className="text-white">
                      {screen.name} - {screen.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="mt-2">Loading screen content...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded p-4">
                <p className="text-red-200">{error}</p>
                <Button
                  onClick={() => selectedScreenId && loadScreenContent(selectedScreenId)}
                  className="mt-2"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {config && (
          <div className="space-y-4">
            {/* Screen Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{config.screen.name}</h3>
                <p className="text-gray-400">{config.screen.location}</p>
                <p className="text-sm text-gray-500">
                  Playlist: {config.playlist.name} ({config.items.length} items)
                </p>
              </CardContent>
            </Card>

            {/* Content Display */}
            {currentItem && (
              <div
                className="relative w-full h-96 rounded-lg overflow-hidden"
                style={{ backgroundColor: config.playlist.background_color || "#000000" }}
              >
                {currentItem.media_type === "image" ? (
                  <Image
                    src={currentItem.media_url || "/placeholder.svg"}
                    alt="Screen content"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <video src={currentItem.media_url} autoPlay muted className="w-full h-full object-contain" />
                )}

                {/* Media Info Overlay */}
                <div className="absolute bottom-4 left-4 bg-black/70 rounded px-3 py-2">
                  <p className="text-sm">
                    Item {currentItemIndex + 1} of {config.items.length}
                  </p>
                  <p className="text-xs text-gray-300">
                    Duration: {currentItem.duration}s | Type: {currentItem.media_type}
                  </p>
                </div>
              </div>
            )}

            {/* Manual Navigation */}
            <div className="flex justify-center space-x-2">
              <Button
                onClick={() => setCurrentItemIndex((prev) => (prev > 0 ? prev - 1 : config.items.length - 1))}
                variant="outline"
                disabled={!config.items.length}
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentItemIndex((prev) => (prev + 1) % config.items.length)}
                variant="outline"
                disabled={!config.items.length}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
