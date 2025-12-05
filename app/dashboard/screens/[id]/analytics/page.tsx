"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CameraAnalytics } from "@/components/camera-analytics"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Eye,
  Users,
  Clock,
  TrendingUp,
  Settings,
  Shield,
  Smile,
  Meh,
  Frown,
  Angry,
  Sunrise as Surprise,
  HelpCircle,
} from "lucide-react"
import { useParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

interface AnalyticsData {
  totalRecords: number
  timeRange: string
  data: any[]
  summary: {
    avgPersonCount: number
    totalInteractions: number
    peakHour: number | null | undefined
    demographics: { male: number; female: number; unknown: number }
    ageGroups: { child: number; teen: number; adult: number; senior: number }
    emotions: { happy: number; neutral: number; sad: number; angry: number; surprised: number; unknown: number }
  }
}

export default function ScreenAnalyticsPage() {
  const params = useParams()
  const screenId = params.id as string

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState("24h")
  const [loading, setLoading] = useState(true)

  const fetchAnalyticsData = useCallback(async () => {
    try {
      console.log("[v0] Fetching analytics data...")
      const response = await fetch(`/api/analytics/data?screenId=${screenId}&timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }, [screenId, timeRange])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    console.log("[v0] Setting up real-time subscription for screen:", screenId)

    const channel = supabase
      .channel(`analytics-${screenId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "analytics",
          filter: `screen_id=eq.${screenId}`,
        },
        (payload) => {
          console.log("[v0] Real-time analytics update received:", payload)
          fetchAnalyticsData()
        },
      )
      .subscribe()

    return () => {
      console.log("[v0] Cleaning up real-time subscription")
      supabase.removeChannel(channel)
    }
  }, [screenId, fetchAnalyticsData])

  // Prepare chart data
  const demographicsData = analyticsData?.summary?.demographics
    ? [
        { name: "Male", value: analyticsData.summary.demographics.male, color: "#3b82f6" },
        { name: "Female", value: analyticsData.summary.demographics.female, color: "#ec4899" },
        { name: "Unknown", value: analyticsData.summary.demographics.unknown, color: "#6b7280" },
      ]
    : []

  const emotionsData = analyticsData?.summary?.emotions
    ? [
        { name: "Happy", value: analyticsData.summary.emotions.happy },
        { name: "Neutral", value: analyticsData.summary.emotions.neutral },
        { name: "Sad", value: analyticsData.summary.emotions.sad },
        { name: "Angry", value: analyticsData.summary.emotions.angry },
        { name: "Surprised", value: analyticsData.summary.emotions.surprised },
      ].filter((item) => item.value > 0)
    : []

  const emotionsDataEnhanced = analyticsData?.summary?.emotions
    ? [
        {
          name: "Happy",
          value: analyticsData.summary.emotions.happy,
          color: "#10b981",
          emoji: "😊",
          icon: Smile,
        },
        {
          name: "Neutral",
          value: analyticsData.summary.emotions.neutral,
          color: "#6b7280",
          emoji: "😐",
          icon: Meh,
        },
        {
          name: "Sad",
          value: analyticsData.summary.emotions.sad,
          color: "#3b82f6",
          emoji: "😢",
          icon: Frown,
        },
        {
          name: "Angry",
          value: analyticsData.summary.emotions.angry,
          color: "#ef4444",
          emoji: "😠",
          icon: Angry,
        },
        {
          name: "Surprised",
          value: analyticsData.summary.emotions.surprised,
          color: "#f59e0b",
          emoji: "😲",
          icon: Surprise,
        },
        {
          name: "Unknown",
          value: analyticsData.summary.emotions.unknown,
          color: "#9ca3af",
          emoji: "❓",
          icon: HelpCircle,
        },
      ]
    : []

  const totalEmotions = emotionsDataEnhanced.reduce((sum, item) => sum + item.value, 0)
  const totalGender = demographicsData.reduce((sum, item) => sum + item.value, 0)

  const demographicsDataEnhanced = demographicsData.map((item) => ({
    ...item,
    percentage: totalGender > 0 ? ((item.value / totalGender) * 100).toFixed(1) : 0,
  }))

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourData = analyticsData?.data.filter((record) => new Date(record.created_at).getHours() === hour) || []

    const totalPeople = hourData.reduce((sum, record) => sum + (record.event_data.personCount || 0), 0)

    return {
      hour: `${hour}:00`,
      people: totalPeople,
      interactions: hourData.reduce((sum, record) => sum + (record.event_data.lookingAtScreen || 0), 0),
    }
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Screen Analytics</h1>
          <p className="text-muted-foreground">AI-powered audience insights and engagement metrics</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch id="analytics-enabled" checked={analyticsEnabled} onCheckedChange={setAnalyticsEnabled} />
            <Label htmlFor="analytics-enabled">Enable Analytics</Label>
          </div>

          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. People</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.summary?.avgPersonCount || 0}</div>
                <p className="text-xs text-muted-foreground">per session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.summary?.totalInteractions || 0}</div>
                <p className="text-xs text-muted-foreground">looking at screen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData?.summary?.peakHour !== null && analyticsData?.summary?.peakHour !== undefined
                    ? `${analyticsData.summary.peakHour}:00`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">highest traffic</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.totalRecords || 0}</div>
                <p className="text-xs text-muted-foreground">last {timeRange}</p>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Traffic Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Traffic Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="people" fill="#3b82f6" name="People Count" />
                  <Bar dataKey="interactions" fill="#10b981" name="Interactions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <CameraAnalytics screenId={screenId} enabled={analyticsEnabled} onToggle={setAnalyticsEnabled} />
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-emerald-400">Gender Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">Audience composition by gender</p>
              </CardHeader>
              <CardContent>
                {totalGender > 0 ? (
                  <div className="flex flex-col items-center space-y-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={demographicsDataEnhanced}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ percentage }) => `${percentage}%`}
                          labelLine={false}
                        >
                          {demographicsDataEnhanced.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value} people`, ""]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="w-full space-y-3">
                      {demographicsDataEnhanced.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{item.value}</span>
                            <span className="text-sm font-semibold min-w-[45px] text-right">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="font-medium text-muted-foreground">No gender data available yet</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Data will appear once analytics are collected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-emerald-400">Emotional Response</CardTitle>
                <p className="text-sm text-muted-foreground">How people feel when viewing your content</p>
              </CardHeader>
              <CardContent>
                {totalEmotions > 0 ? (
                  <div className="space-y-6">
                    {emotionsDataEnhanced.map((emotion, index) => {
                      const percentage = totalEmotions > 0 ? (emotion.value / totalEmotions) * 100 : 0
                      const Icon = emotion.icon

                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{emotion.emoji}</span>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" style={{ color: emotion.color }} />
                                <span className="text-sm font-medium">{emotion.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">{emotion.value}</span>
                              <span className="text-sm font-semibold min-w-[45px] text-right">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: emotion.color,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Smile className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="font-medium text-muted-foreground">No emotional data available yet</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Data will appear once analytics are collected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-400">Age Group Distribution</CardTitle>
              <p className="text-sm text-muted-foreground">Audience breakdown by age</p>
            </CardHeader>
            <CardContent>
              {analyticsData?.summary?.ageGroups &&
              analyticsData.summary.ageGroups.child +
                analyticsData.summary.ageGroups.teen +
                analyticsData.summary.ageGroups.adult +
                analyticsData.summary.ageGroups.senior >
                0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Child",
                      emoji: "👶",
                      value: analyticsData.summary.ageGroups.child,
                      color: "#f59e0b",
                    },
                    {
                      label: "Teen",
                      emoji: "🧒",
                      value: analyticsData.summary.ageGroups.teen,
                      color: "#3b82f6",
                    },
                    {
                      label: "Adult",
                      emoji: "🧑",
                      value: analyticsData.summary.ageGroups.adult,
                      color: "#10b981",
                    },
                    {
                      label: "Senior",
                      emoji: "👴",
                      value: analyticsData.summary.ageGroups.senior,
                      color: "#8b5cf6",
                    },
                  ].map((age, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-4xl mb-2">{age.emoji}</span>
                      <span className="text-sm font-medium mb-1">{age.label}</span>
                      <span className="text-2xl font-bold" style={{ color: age.color }}>
                        {age.value}
                      </span>
                      <span className="text-xs text-muted-foreground">people</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="font-medium text-muted-foreground">No age data available yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Data will appear once analytics are collected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="interactions"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Screen Interactions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Data Protection</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All video frames are processed locally and immediately deleted</li>
                  <li>• Only anonymized analytics data is stored</li>
                  <li>• No personal identification or facial recognition</li>
                  <li>• Data retention limited to 30 days by default</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Compliance</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• GDPR compliant data processing</li>
                  <li>• Consent management for public spaces</li>
                  <li>• Right to data deletion</li>
                  <li>• Transparent data usage policies</li>
                </ul>
              </div>

              <Button variant="outline" className="w-full bg-transparent">
                Download Privacy Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
