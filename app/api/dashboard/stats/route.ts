import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userScreens } = await supabase.from("screens").select("id").eq("user_id", user.id)

    const screenIds = userScreens?.map((s) => s.id) || []

    // Get active screens count
    const { count: screensCount } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "online")

    // Get total media files count
    const { count: mediaCount } = await supabase
      .from("media")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    // Get active playlists count
    const { count: playlistsCount } = await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true)

    let viewsCount = 0
    if (screenIds.length > 0) {
      const { count } = await supabase
        .from("analytics")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "media_start")
        .in("screen_id", screenIds)
      viewsCount = count || 0
    }

    // Get previous period counts for comparison
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { count: previousMediaCount } = await supabase
      .from("media")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lt("created_at", oneWeekAgo.toISOString())

    const { count: previousPlaylistsCount } = await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true)
      .lt("created_at", oneWeekAgo.toISOString())

    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    let previousViewsCount = 0
    if (screenIds.length > 0) {
      const { count } = await supabase
        .from("analytics")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "media_start")
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", oneWeekAgo.toISOString())
        .in("screen_id", screenIds)
      previousViewsCount = count || 0
    }

    // Calculate changes
    const mediaChange = (mediaCount || 0) - (previousMediaCount || 0)
    const playlistsChange = (playlistsCount || 0) - (previousPlaylistsCount || 0)
    const viewsChange = previousViewsCount
      ? Math.round((((viewsCount || 0) - previousViewsCount) / previousViewsCount) * 100)
      : 0

    return NextResponse.json({
      stats: {
        activeScreens: {
          value: screensCount || 0,
          change: "+2 from last month", // TODO: Calculate actual change
        },
        mediaFiles: {
          value: mediaCount || 0,
          change: mediaChange > 0 ? `+${mediaChange} this week` : `${mediaChange} this week`,
        },
        activePlaylists: {
          value: playlistsCount || 0,
          change: playlistsChange > 0 ? `+${playlistsChange} this week` : `${playlistsChange} this week`,
        },
        totalViews: {
          value: viewsCount || 0,
          change: viewsChange > 0 ? `+${viewsChange}% from last week` : `${viewsChange}% from last week`,
        },
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
