import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const screenId = searchParams.get("screenId")
    const deviceId = searchParams.get("deviceId")
    const timeRange = searchParams.get("timeRange") || "24h" // 24h, 7d, 30d

    const supabase = await createClient()

    // Calculate time range
    const now = new Date()
    let startDate = new Date()
    
    switch (timeRange) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    // Build query
    let query = supabase
      .from("device_events")
      .select("*, devices(device_code, screens(name)), media(name)")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })

    if (screenId) {
      query = query.eq("screen_id", screenId)
    }
    if (deviceId) {
      query = query.eq("device_id", deviceId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error("[v0] Error fetching proof of play events:", error)
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
    }

    // Calculate statistics
    const mediaStarts = events.filter((e) => e.event_type === "media_start").length
    const mediaEnds = events.filter((e) => e.event_type === "media_end").length
    const mediaErrors = events.filter((e) => e.event_type === "media_error").length

    // Group by media_id to get play counts
    const mediaPlayCounts: Record<string, { count: number; name: string }> = {}
    events
      .filter((e) => e.event_type === "media_start")
      .forEach((event) => {
        const mediaId = event.media_id
        if (mediaId) {
          if (!mediaPlayCounts[mediaId]) {
            mediaPlayCounts[mediaId] = {
              count: 0,
              name: event.media?.name || "Unknown",
            }
          }
          mediaPlayCounts[mediaId].count++
        }
      })

    // Get top 10 most played media
    const topMedia = Object.entries(mediaPlayCounts)
      .map(([id, data]) => ({
        media_id: id,
        media_name: data.name,
        play_count: data.count,
      }))
      .sort((a, b) => b.play_count - a.play_count)
      .slice(0, 10)

    // Group events by hour for timeline chart
    const timeline = Array.from({ length: 24 }, (_, hour) => {
      const hourEvents = events.filter((e) => {
        const eventHour = new Date(e.created_at).getHours()
        return eventHour === hour
      })

      return {
        hour: `${hour}:00`,
        plays: hourEvents.filter((e) => e.event_type === "media_start").length,
        errors: hourEvents.filter((e) => e.event_type === "media_error").length,
      }
    })

    return NextResponse.json({
      summary: {
        total_plays: mediaStarts,
        completed_plays: mediaEnds,
        errors: mediaErrors,
        success_rate: mediaStarts > 0 ? ((mediaEnds / mediaStarts) * 100).toFixed(1) : "0",
      },
      top_media: topMedia,
      timeline,
      recent_events: events.slice(0, 50), // Last 50 events
      time_range: timeRange,
    })
  } catch (error) {
    console.error("[v0] Proof of play stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
