import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's playlists with media count
    const { data: playlists, error } = await supabase
      .from("playlists")
      .select(`
        *,
        playlist_items(count)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 })
    }

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error("Error listing playlists:", error)
    return NextResponse.json({ error: "Failed to list playlists" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      name,
      description,
      scale_image = "fit",
      scale_video = "fit",
      scale_document = "fit",
      shuffle = false,
      default_transition = "fade",
    } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 })
    }

    // Create new playlist
    const { data: playlist, error } = await supabase
      .from("playlists")
      .insert({
        user_id: user.id,
        name,
        description,
        is_active: true,
        scale_image,
        scale_video,
        scale_document,
        shuffle,
        default_transition,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 })
    }

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error("Error creating playlist:", error)
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 })
  }
}
