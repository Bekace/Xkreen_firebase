import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
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

    // Get playlist with media items
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select(`
        *,
        playlist_items(
          id,
          duration_override,
          position,
          transition_type,
          transition_duration,
          media(*)
        )
      `)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (playlistError) {
      console.error("Database error:", playlistError)
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
    }

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error("Error fetching playlist:", error)
    return NextResponse.json({ error: "Failed to fetch playlist" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    const { name, description } = await request.json()

    const { data: playlist, error: updateError } = await supabase
      .from("playlists")
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json({ error: "Failed to update playlist" }, { status: 500 })
    }

    const { data: screenPlaylists } = await supabase
      .from("screen_playlists")
      .select("screen_id")
      .eq("playlist_id", params.id)

    if (screenPlaylists && screenPlaylists.length > 0) {
      const screenIds = screenPlaylists.map((sp) => sp.screen_id)
      await supabase.from("screens").update({ updated_at: new Date().toISOString() }).in("id", screenIds)
    }

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error("Error updating playlist:", error)
    return NextResponse.json({ error: "Failed to update playlist" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Delete playlist (cascade will handle playlist_items)
    const { error: deleteError } = await supabase.from("playlists").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Database error:", deleteError)
      return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting playlist:", error)
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 })
  }
}
