import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Monitor, ImageIcon, PlayCircle } from "lucide-react"

interface Activity {
  action: string
  time: string
  icon: any
  type: "screen_online" | "screen_offline" | "media_upload" | "playlist_update"
}

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ activities: [] }, { status: 200 })
    }

    const activities: Activity[] = []

    // Fetch recent screen online/offline status changes (last 24 hours)
    const { data: screenStatusChanges } = await supabase
      .from("device_status_log")
      .select("device_id, status, created_at, devices(screen_id, screens(name))")
      .order("created_at", { ascending: false })
      .limit(20)

    if (screenStatusChanges) {
      screenStatusChanges.forEach((log: any) => {
        if (log.devices?.screens?.name) {
          const isOnline = log.status === "online"
          const timeAgo = formatTimeAgo(new Date(log.created_at))
          activities.push({
            action: `Screen '${log.devices.screens.name}' went ${isOnline ? "online" : "offline"}`,
            time: timeAgo,
            icon: Monitor,
            type: isOnline ? "screen_online" : "screen_offline",
          })
        }
      })
    }

    // Fetch recent media uploads (last 24 hours)
    const { data: mediaUploads } = await supabase
      .from("media")
      .select("name, created_at")
      .order("created_at", { ascending: false })
      .limit(10)

    if (mediaUploads) {
      mediaUploads.forEach((media: any) => {
        const timeAgo = formatTimeAgo(new Date(media.created_at))
        activities.push({
          action: `New media file '${media.name}' uploaded`,
          time: timeAgo,
          icon: ImageIcon,
          type: "media_upload",
        })
      })
    }

    // Fetch recent playlist updates (last 24 hours)
    const { data: playlistUpdates } = await supabase
      .from("playlists")
      .select("name, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10)

    if (playlistUpdates) {
      playlistUpdates.forEach((playlist: any) => {
        const timeAgo = formatTimeAgo(new Date(playlist.updated_at))
        activities.push({
          action: `Playlist '${playlist.name}' updated`,
          time: timeAgo,
          icon: PlayCircle,
          type: "playlist_update",
        })
      })
    }

    // Sort by time and return top 10
    activities.sort((a, b) => {
      const aTime = parseTimeAgo(a.time)
      const bTime = parseTimeAgo(b.time)
      return aTime - bTime
    })

    return NextResponse.json(
      { activities: activities.slice(0, 10) },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Error fetching recent activities:", error)
    return NextResponse.json({ activities: [] }, { status: 500 })
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  return date.toLocaleDateString()
}

function parseTimeAgo(timeStr: string): number {
  const parts = timeStr.split(" ")
  const value = parseInt(parts[0])
  const unit = parts[1]

  switch (unit) {
    case "just":
      return 0
    case "minutes":
      return value * 60
    case "hours":
      return value * 3600
    case "days":
      return value * 86400
    default:
      return 999999
  }
}
