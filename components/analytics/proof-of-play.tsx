"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Play, CheckCircle, AlertCircle, RefreshCw, Clock } from "lucide-react"

interface ProofOfPlayProps {
  screenId?: string
  deviceId?: string
}

interface ProofOfPlayData {
  summary: {
    total_plays: number
    completed_plays: number
    errors: number
    success_rate: string
  }
  top_media: Array<{
    media_id: string
    media_name: string
    play_count: number
  }>
  timeline: Array<{
    hour: string
    plays: number
    errors: number
  }>
  recent_events: Array<{
    id: string
    event_type: string
    media_id: string
    created_at: string
    media?: { name: string }
    devices?: { device_code: string }
  }>
  time_range: string
}

export function ProofOfPlay({ screenId, deviceId }: ProofOfPlayProps) {
  const [data, setData] = useState<ProofOfPlayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("24h")

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ timeRange })
      if (screenId) params.append("screenId", screenId)
      if (deviceId) params.append("deviceId", deviceId)

      const response = await fetch(`/api/proof-of-play/stats?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error("[v0] Error fetching proof of play data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timeRange, screenId, deviceId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No proof of play data available</p>
        </CardContent>
      </Card>
    )
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "media_start":
        return <Play className="h-4 w-4 text-blue-500" />
      case "media_end":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "media_error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "media_start":
        return "bg-blue-100 text-blue-700"
      case "media_end":
        return "bg-green-100 text-green-700"
      case "media_error":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Proof of Play</h2>
          <p className="text-muted-foreground">Track media playback events and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_plays}</div>
            <p className="text-xs text-muted-foreground">Media started</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.completed_plays}</div>
            <p className="text-xs text-muted-foreground">Played to end</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.errors}</div>
            <p className="text-xs text-muted-foreground">Playback failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.success_rate}%</div>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Playback Timeline</CardTitle>
            <CardDescription>Media plays and errors by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="plays" stroke="#06b6d4" strokeWidth={2} name="Plays" />
                <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Media Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Media</CardTitle>
            <CardDescription>Most played content</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.top_media.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="media_name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="play_count" fill="#06b6d4" name="Plays" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Latest playback events from devices</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No events recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.recent_events.slice(0, 20).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getEventIcon(event.event_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.media?.name || "Unknown media"}</p>
                      <p className="text-xs text-muted-foreground">
                        Device: {event.devices?.device_code || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getEventColor(event.event_type)} variant="secondary">
                      {event.event_type.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
