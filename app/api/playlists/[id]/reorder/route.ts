import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 503 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items data" }, { status: 400 })
    }

    // Verify playlist ownership
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: "Playlist not found or access denied" }, { status: 404 })
    }

    // Update positions for all items
    const updates = items.map((item) => ({
      id: item.id,
      position: item.position,
    }))

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("playlist_items")
        .update({ position: update.position })
        .eq("id", update.id)
        .eq("playlist_id", params.id)

      if (updateError) {
        console.error("Error updating position:", updateError)
        return NextResponse.json({ error: "Failed to update item positions" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reorder error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
