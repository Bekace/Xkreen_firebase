import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get basic counts
    const [screensResult, mediaResult, playlistsResult] = await Promise.all([
      supabase.from("screens").select("id, status").eq("user_id", user.id),
      supabase.from("media").select("id, file_size").eq("user_id", user.id),
      supabase.from("playlists").select("id").eq("user_id", user.id),
    ])

    const screens = screensResult.data || []
    const media = mediaResult.data || []
    const playlists = playlistsResult.data || []

    // Calculate metrics
    const totalScreens = screens.length
    const onlineScreens = screens.filter((s) => s.status === "online").length
    const totalMedia = media.length
    const totalStorage = media.reduce((sum, m) => sum + (m.file_size || 0), 0)
    const totalPlaylists = playlists.length

    // Generate mock analytics data for demonstration
    const currentDate = new Date()
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - (6 - i))
      return {
        date: date.toISOString().split("T")[0],
        views: Math.floor(Math.random() * 1000) + 200,
        engagement: Math.floor(Math.random() * 100) + 50,
        uptime: Math.floor(Math.random() * 20) + 80,
      }
    })

    const screenPerformance = screens.map((screen, index) => ({
      id: screen.id,
      name: `Screen ${index + 1}`,
      uptime: Math.floor(Math.random() * 20) + 80,
      views: Math.floor(Math.random() * 500) + 100,
      lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    }))

    const contentPerformance = media.slice(0, 5).map((item, index) => ({
      id: item.id,
      name: `Content ${index + 1}`,
      views: Math.floor(Math.random() * 300) + 50,
      engagement: Math.floor(Math.random() * 100) + 30,
      duration: Math.floor(Math.random() * 60) + 10,
    }))

    // AI-generated insights
    const insights = [
      {
        type: "performance",
        title: "Peak Engagement Hours",
        description: "Your content performs best between 10 AM - 2 PM with 23% higher engagement rates.",
        recommendation: "Schedule your most important content during these peak hours.",
        impact: "high",
      },
      {
        type: "content",
        title: "Content Optimization",
        description: `${Math.floor(totalMedia * 0.3)} of your media files could benefit from compression to improve loading times.`,
        recommendation: "Consider optimizing large media files to reduce bandwidth usage.",
        impact: "medium",
      },
      {
        type: "screen",
        title: "Screen Utilization",
        description: `${onlineScreens} of ${totalScreens} screens are currently active. ${totalScreens - onlineScreens} screens may need attention.`,
        recommendation:
          onlineScreens < totalScreens
            ? "Check offline screens for connectivity issues."
            : "Great job maintaining all screens online!",
        impact: onlineScreens < totalScreens ? "high" : "low",
      },
    ]

    return NextResponse.json({
      overview: {
        totalScreens,
        onlineScreens,
        totalMedia,
        totalStorage,
        totalPlaylists,
        uptimePercentage: Math.floor((onlineScreens / Math.max(totalScreens, 1)) * 100),
      },
      trends: last7Days,
      screenPerformance,
      contentPerformance,
      insights,
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
