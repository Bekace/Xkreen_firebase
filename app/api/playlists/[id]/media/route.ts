import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { media_id, duration = 10 } = await request.json()

    if (!media_id) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 })
    }

    // Verify playlist ownership
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
    }

    const { data: lastItem } = await supabase
      .from("playlist_items")
      .select("position")
      .eq("playlist_id", params.id)
      .order("position", { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (lastItem?.position || 0) + 1

    const { data: playlistItem, error } = await supabase
      .from("playlist_items")
      .insert({
        playlist_id: params.id,
        media_id,
        duration_override: duration,
        position: nextPosition,
      })
      .select(`
        *,
        media(*)
      `)
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to add media to playlist" }, { status: 500 })
    }

    return NextResponse.json({ playlistItem })
  } catch (error) {
    console.error("Error adding media to playlist:", error)
    return NextResponse.json({ error: "Failed to add media to playlist" }, { status: 500 })
  }
}
