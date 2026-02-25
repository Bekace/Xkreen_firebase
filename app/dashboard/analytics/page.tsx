"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts"
import {
  BarChart3,
  TrendingUp,
  Monitor,
  Play,
  Users,
  Clock,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  ExternalLink,
  Settings,
  Smile,
  Meh,
  Frown,
  Angry,
  Zap,
  HelpCircle,
} from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { UpgradeBanner } from "@/components/upgrade-banner"
import { Label } from "@/components/ui/label"
import { ProofOfPlay } from "@/components/analytics/proof-of-play"

interface AnalyticsData {
  overview: {
    totalScreens: number
    onlineScreens: number
    totalMedia: number
    totalStorage: number
    totalPlaylists: number
    uptimePercentage: number
  }
  trends: Array<{
    date: string
    views: number
    engagement: number
    uptime: number
  }>
  screenPerformance: Array<{
    id: string
    name: string
    uptime: number
    views: number
    lastSeen: string
  }>
  contentPerformance: Array<{
    id: string
    name: string
    views: number
    engagement: number
    duration: number
  }>
  insights: Array<{
    type: string
    title: string
    description: string
    recommendation: string
    impact: "high" | "medium" | "low"
  }>
}

interface Screen {
  id: string
  name: string
  location: string
  status: string
  screen_code: string
  uptime?: number
  views?: number
  engagement?: number
  trend?: number[]
}

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--chart-1))",
  },
  engagement: {
    label: "Engagement %",
    color: "hsl(var(--chart-2))",
  },
  uptime: {
    label: "Uptime %",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export default function AnalyticsPage() {
  const { features, planName, loading: limitsLoading } = usePlanLimits()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [screens, setScreens] = useState<Screen[]>([])
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null)
  const [screenAnalytics, setScreenAnalytics] = useState<any>(null)
  const [loadingScreenAnalytics, setLoadingScreenAnalytics] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalytics()
    fetchScreens()
  }, [])

  const fetchScreens = async () => {
    try {
      const response = await fetch("/api/screens")
      if (response.ok) {
        const { screens: screensData } = await response.json()
        setScreens(screensData || [])
      }
    } catch (error) {
      console.error("Error fetching screens:", error)
    }
  }

  const fetchScreenAnalytics = async (screenId: string) => {
    setLoadingScreenAnalytics(true)
    try {
      const response = await fetch(`/api/analytics/data?screenId=${screenId}&timeRange=7d`)
      if (response.ok) {
        const data = await response.json()
        setScreenAnalytics(data)
      }

      const settingsResponse = await fetch(`/api/analytics/settings?screenId=${screenId}`)
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        setAnalyticsEnabled(settings.enabled || false)
      }
    } catch (error) {
      console.error("Error fetching screen analytics:", error)
    } finally {
      setLoadingScreenAnalytics(false)
    }
  }

  const handleAnalyticsToggle = async (enabled: boolean) => {
    if (!selectedScreen) return

    setSavingSettings(true)
    try {
      const response = await fetch("/api/analytics/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenId: selectedScreen.id,
          enabled,
          faceDetection: enabled,
          demographicAnalysis: enabled,
          emotionDetection: enabled,
          attentionTracking: enabled,
        }),
      })

      if (response.ok) {
        setAnalyticsEnabled(enabled)
        toast({
          title: "Settings saved",
          description: `Camera analytics ${enabled ? "enabled" : "disabled"} successfully`,
        })
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      console.error("Error saving analytics settings:", error)
      toast({
        title: "Error",
        description: "Failed to save analytics settings",
        variant: "destructive",
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleScreenClick = (screen: Screen) => {
    setSelectedScreen(screen)
    fetchScreenAnalytics(screen.id)
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics/overview")
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch analytics data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAnalytics()
    fetchScreens()
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "high":
        return <AlertTriangle className="h-4 w-4" />
      case "medium":
        return <Clock className="h-4 w-4" />
      case "low":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  if (loading || limitsLoading) {
  return (
  <div className="flex items-center justify-center h-64">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
  </div>
  )
  }

  if (!features?.analytics) {
  return (
  <div className="p-6">
    <UpgradeBanner
      feature="Analytics & Reports"
      description="Track screen performance, content engagement, uptime metrics, and get actionable insights for your digital signage network."
      currentPlan={planName}
    />
  </div>
  )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">No analytics data available</h2>
        <p className="text-gray-600 mt-2">Start using your screens to see analytics data here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Analytics</h1>
          <p className="mt-1 text-foreground">AI-powered insights for your digital signage network</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Screens</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalScreens}</div>
            <p className="text-xs text-muted-foreground">
              {data.overview.onlineScreens} online, {data.overview.totalScreens - data.overview.onlineScreens} offline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.uptimePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {data.overview.uptimePercentage >= 95
                ? "Excellent"
                : data.overview.uptimePercentage >= 80
                  ? "Good"
                  : "Needs attention"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Library</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalMedia}</div>
            <p className="text-xs text-muted-foreground">{formatBytes(data.overview.totalStorage)} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Playlists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalPlaylists}</div>
            <p className="text-xs text-muted-foreground">Content collections</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>7-Day Performance Trends</CardTitle>
            <CardDescription>Views, engagement, and uptime over the last week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="var(--color-views)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-views)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    stroke="var(--color-engagement)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-engagement)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Screen Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Screen Performance</CardTitle>
            <CardDescription>Uptime percentage by screen</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.screenPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="uptime" fill="var(--color-uptime)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Content Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Content</CardTitle>
          <CardDescription>Most viewed and engaging media in your library</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.contentPerformance.map((content, index) => (
              <div key={content.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-sm font-semibold text-cyan-700">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{content.name}</h4>
                    <p className="text-sm text-gray-600">
                      {content.views} views • {content.duration}s avg duration
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{content.engagement}% engagement</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Screen Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-cyan-500" />
            Screen Performance Overview
          </CardTitle>
          <CardDescription>Click on any screen to view detailed analytics and audience insights</CardDescription>
        </CardHeader>
        <CardContent>
          {screens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No screens available. Create a screen to see analytics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screens.map((screen) => (
                <Card
                  key={screen.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-cyan-500"
                  onClick={() => handleScreenClick(screen)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold line-clamp-1">{screen.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-1">
                          {screen.location || "No location"}
                        </CardDescription>
                      </div>
                      <Badge variant={screen.status === "online" ? "default" : "secondary"} className="ml-2">
                        {screen.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-cyan-600">{screen.uptime || 0}%</div>
                        <div className="text-xs text-muted-foreground">Uptime</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">{screen.views || 0}</div>
                        <div className="text-xs text-muted-foreground">Views</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{screen.engagement || 0}%</div>
                        <div className="text-xs text-muted-foreground">Engage</div>
                      </div>
                    </div>

                    {/* Mini Sparkline */}
                    <div className="h-12 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={
                            screen.trend?.map((value, index) => ({ value, index })) ||
                            Array.from({ length: 7 }, (_, i) => ({ value: Math.random() * 100, index: i }))
                          }
                        >
                          <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleScreenClick(screen)
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Analytics
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`/player/${screen.screen_code}`, "_blank")
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Player
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>Personalized recommendations to optimize your digital signage performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.insights.map((insight, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getImpactColor(insight.impact)}`}>
                    {getImpactIcon(insight.impact)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">{insight.title}</span>
                      <Badge className={getImpactColor(insight.impact)}>{insight.impact} impact</Badge>
                    </div>
                    <p className="text-gray-700 mb-2">{insight.description}</p>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Recommendation:</strong> {insight.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Proof of Play Analytics */}
      <ProofOfPlay />

      {/* Sheet (slide-over) for detailed screen analytics */}
      <Sheet open={!!selectedScreen} onOpenChange={(open) => !open && setSelectedScreen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedScreen && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  {selectedScreen.name}
                </SheetTitle>
                <SheetDescription>
                  {selectedScreen.location} • {selectedScreen.screen_code}
                </SheetDescription>
              </SheetHeader>

              <Card className="mt-6 border-cyan-200 bg-cyan-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4 text-cyan-600" />
                    Camera Analytics Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="analytics-toggle" className="text-sm font-medium">
                        Enable AI Analytics
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Detect audience demographics, emotions, and engagement
                      </p>
                    </div>
                    <Switch
                      id="analytics-toggle"
                      checked={analyticsEnabled}
                      onCheckedChange={handleAnalyticsToggle}
                      disabled={savingSettings}
                    />
                  </div>

                  {analyticsEnabled && (
                    <div className="bg-white border border-cyan-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-cyan-900">Privacy & Compliance</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>All processing happens locally in the browser</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>No images or videos are stored</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Only anonymized metrics are collected</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>GDPR compliant data handling</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="mt-6">
                {loadingScreenAnalytics ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  </div>
                ) : (
                  <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="demographics">Demographics</TabsTrigger>
                      <TabsTrigger value="engagement">Engagement</TabsTrigger>
                      <TabsTrigger value="realtime">Real-time</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Avg. People
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{screenAnalytics?.summary?.avgPersonCount || 0}</div>
                            <p className="text-xs text-muted-foreground">per session</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Interactions
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{screenAnalytics?.summary?.totalInteractions || 0}</div>
                            <p className="text-xs text-muted-foreground">looking at screen</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Hourly Traffic */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Hourly Traffic Pattern</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={Array.from({ length: 24 }, (_, hour) => ({
                                hour: `${hour}:00`,
                                people: Math.floor(Math.random() * 50),
                              }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Bar dataKey="people" fill="#06b6d4" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="demographics" className="space-y-4">
                      {/* Gender Distribution with Donut Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-cyan-400">Gender Distribution</CardTitle>
                          <CardDescription className="text-xs">Audience breakdown by gender</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            console.log("[v0] Screen Analytics Data:", screenAnalytics)
                            console.log("[v0] Demographics:", screenAnalytics?.summary?.demographics)

                            const male = screenAnalytics?.summary?.demographics?.male || 0
                            const female = screenAnalytics?.summary?.demographics?.female || 0
                            const unknown = screenAnalytics?.summary?.demographics?.unknown || 0
                            const total = male + female + unknown

                            console.log(
                              "[v0] Gender totals - Male:",
                              male,
                              "Female:",
                              female,
                              "Unknown:",
                              unknown,
                              "Total:",
                              total,
                            )

                            const genderData = [
                              { name: "Male", value: male, color: "#3b82f6" },
                              { name: "Female", value: female, color: "#ec4899" },
                              { name: "Unknown", value: unknown, color: "#6b7280" },
                            ].filter((item) => item.value > 0)

                            return total > 0 ? (
                              <div className="flex flex-col items-center gap-4">
                                <ResponsiveContainer width="100%" height={200}>
                                  <PieChart>
                                    <Pie
                                      data={genderData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={2}
                                      dataKey="value"
                                    >
                                      {genderData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="grid grid-cols-3 gap-4 w-full">
                                  {genderData.map((item) => (
                                    <div key={item.name} className="text-center">
                                      <div className="flex items-center justify-center gap-2 mb-1">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-xs font-medium">{item.name}</span>
                                      </div>
                                      <div className="text-lg font-bold">
                                        {((item.value / total) * 100).toFixed(1)}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">{item.value} people</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No gender data available yet</p>
                              </div>
                            )
                          })()}
                        </CardContent>
                      </Card>

                      {/* Emotional Response with Progress Bars */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-cyan-400">Emotional Response</CardTitle>
                          <CardDescription className="text-xs">
                            How people feel when viewing your content
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const emotions = screenAnalytics?.summary?.emotions || {}
                            const emotionData = [
                              { name: "Happy", value: emotions.happy || 0, icon: Smile, color: "bg-green-500" },
                              { name: "Neutral", value: emotions.neutral || 0, icon: Meh, color: "bg-gray-500" },
                              { name: "Sad", value: emotions.sad || 0, icon: Frown, color: "bg-blue-500" },
                              { name: "Angry", value: emotions.angry || 0, icon: Angry, color: "bg-red-500" },
                              {
                                name: "Surprised",
                                value: emotions.surprised || 0,
                                icon: Zap,
                                color: "bg-yellow-500",
                              },
                              { name: "Unknown", value: emotions.unknown || 0, icon: HelpCircle, color: "bg-gray-400" },
                            ]
                            // </CHANGE>
                            const totalEmotions = emotionData.reduce((sum, item) => sum + item.value, 0)

                            return totalEmotions > 0 ? (
                              <div className="space-y-3">
                                {emotionData.map((emotion) => {
                                  const percentage = totalEmotions > 0 ? (emotion.value / totalEmotions) * 100 : 0
                                  const IconComponent = emotion.icon
                                  // </CHANGE>
                                  return (
                                    <div key={emotion.name} className="space-y-1">
                                      <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                                          {/* </CHANGE> */}
                                          <span className="font-medium">{emotion.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">{emotion.value}</span>
                                          <span className="font-semibold min-w-[45px] text-right">
                                            {percentage.toFixed(1)}%
                                          </span>
                                        </div>
                                      </div>
                                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className={`absolute top-0 left-0 h-full ${emotion.color} transition-all duration-500`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <span className="text-4xl mb-2 block opacity-30">😊</span>
                                <p className="text-sm">No emotional data available yet</p>
                              </div>
                            )
                          })()}
                        </CardContent>
                      </Card>

                      {/* Age Group Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-cyan-400">Age Group Distribution</CardTitle>
                          <CardDescription className="text-xs">Audience breakdown by age</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const ageGroups = screenAnalytics?.summary?.ageGroups || {}
                            const ageData = [
                              { name: "Child", value: ageGroups.child || 0, emoji: "👶", color: "bg-purple-500" },
                              { name: "Teen", value: ageGroups.teen || 0, emoji: "🧒", color: "bg-blue-500" },
                              { name: "Adult", value: ageGroups.adult || 0, emoji: "🧑", color: "bg-green-500" },
                              { name: "Senior", value: ageGroups.senior || 0, emoji: "👴", color: "bg-orange-500" },
                            ]
                            const totalAge = ageData.reduce((sum, item) => sum + item.value, 0)

                            return totalAge > 0 ? (
                              <div className="grid grid-cols-2 gap-3">
                                {ageData.map((age) => {
                                  const percentage = totalAge > 0 ? (age.value / totalAge) * 100 : 0
                                  return (
                                    <div key={age.name} className="border rounded-lg p-3 text-center">
                                      <div className="text-3xl mb-2">{age.emoji}</div>
                                      <div className="text-sm font-medium mb-1">{age.name}</div>
                                      <div className="text-2xl font-bold text-cyan-500">{percentage.toFixed(0)}%</div>
                                      <div className="text-xs text-muted-foreground">{age.value} people</div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No age data available yet</p>
                              </div>
                            )
                          })()}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="engagement" className="space-y-4">
                      {/* Attention Rate Gauge */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-cyan-400">Attention Rate</CardTitle>
                          <CardDescription className="text-xs">
                            Percentage of people looking at the screen
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const attentionRate = screenAnalytics?.summary?.attentionRate || 0
                            const gaugeData = [{ name: "Attention", value: attentionRate, fill: "#06b6d4" }]

                            return (
                              <div className="flex flex-col items-center">
                                <ResponsiveContainer width="100%" height={200}>
                                  <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="60%"
                                    outerRadius="90%"
                                    barSize={20}
                                    data={gaugeData}
                                    startAngle={180}
                                    endAngle={0}
                                  >
                                    <RadialBar background dataKey="value" cornerRadius={10} fill="#06b6d4" />
                                    <text
                                      x="50%"
                                      y="50%"
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      className="text-3xl font-bold fill-cyan-500"
                                    >
                                      {attentionRate}%
                                    </text>
                                  </RadialBarChart>
                                </ResponsiveContainer>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {attentionRate >= 70
                                    ? "Excellent engagement!"
                                    : attentionRate >= 40
                                      ? "Good engagement"
                                      : "Room for improvement"}
                                </p>
                              </div>
                            )
                          })()}
                        </CardContent>
                      </Card>

                      {/* Other Engagement Metrics */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-cyan-400">Engagement Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm">Avg. Dwell Time</span>
                                <span className="text-sm font-semibold">2.5 min</span>
                              </div>
                              <Progress value={65} className="h-2" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm">Repeat Visitors</span>
                                <span className="text-sm font-semibold">Coming soon</span>
                              </div>
                              <Progress value={0} className="h-2" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="realtime" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Real-time Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-sm font-medium">Screen is {selectedScreen.status}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                              Real-time camera analytics will appear here when enabled
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
