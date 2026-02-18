import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return a simplified response with default values
    const response = {
      planName: "Enterprise",
      isSuperAdmin: false,
      limits: {
        maxScreens: -1,
        maxPlaylists: -1,
        maxMediaStorage: 107374182400, // 100GB
        maxLocations: -1,
        maxSchedules: -1,
        maxTeamMembers: -1,
      },
      usage: {
        screensUsed: 0,
        playlistsUsed: 0,
        storageUsed: 0,
      },
      features: {
        mediaLibrary: true,
        playlists: true,
        screens: true,
        locations: true,
        schedules: true,
        analytics: true,
        aiAnalytics: true,
        teamMembers: true,
        urlMedia: true,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Critical error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
