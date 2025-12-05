import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
      .maybeSingle()

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

    await supabase.from("playlists").update({ updated_at: new Date().toISOString() }).eq("id", params.id)

    const { data: screenPlaylists } = await supabase
      .from("screen_playlists")
      .select("screen_id")
      .eq("playlist_id", params.id)

    if (screenPlaylists && screenPlaylists.length > 0) {
      const screenIds = screenPlaylists.map((sp) => sp.screen_id)
      await supabase.from("screens").update({ updated_at: new Date().toISOString() }).in("id", screenIds)
    }

    return NextResponse.json({ playlistItem })
  } catch (error) {
    console.error("Error adding media to playlist:", error)
    return NextResponse.json({ error: "Failed to add media to playlist" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { playlist_item_id, duration_override, transition_type, transition_duration } = await request.json()

    if (!playlist_item_id || duration_override === undefined) {
      return NextResponse.json({ error: "Playlist item ID and duration are required" }, { status: 400 })
    }

    // Verify playlist ownership through playlist_items
    const { data: playlistItem, error: verifyError } = await supabase
      .from("playlist_items")
      .select(`
        id,
        playlists!inner(user_id)
      `)
      .eq("id", playlist_item_id)
      .eq("playlists.user_id", user.id)
      .single()

    if (verifyError || !playlistItem) {
      return NextResponse.json({ error: "Playlist item not found or unauthorized" }, { status: 404 })
    }

    const updateData: any = { duration_override }
    if (transition_type !== undefined) {
      updateData.transition_type = transition_type
    }
    if (transition_duration !== undefined) {
      updateData.transition_duration = transition_duration
    }

    // Update the playlist item with all provided fields
    const { data: updatedItem, error: updateError } = await supabase
      .from("playlist_items")
      .update(updateData)
      .eq("id", playlist_item_id)
      .select(`
        *,
        media(*)
      `)
      .single()

    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json({ error: "Failed to update playlist item" }, { status: 500 })
    }

    await supabase.from("playlists").update({ updated_at: new Date().toISOString() }).eq("id", params.id)

    const { data: screenPlaylists } = await supabase
      .from("screen_playlists")
      .select("screen_id")
      .eq("playlist_id", params.id)

    if (screenPlaylists && screenPlaylists.length > 0) {
      const screenIds = screenPlaylists.map((sp) => sp.screen_id)
      await supabase.from("screens").update({ updated_at: new Date().toISOString() }).in("id", screenIds)
    }

    return NextResponse.json({ playlistItem: updatedItem })
  } catch (error) {
    console.error("Error updating playlist item:", error)
    return NextResponse.json({ error: "Failed to update playlist item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { playlist_item_id } = await request.json()

    if (!playlist_item_id) {
      return NextResponse.json({ error: "Playlist item ID is required" }, { status: 400 })
    }

    // Verify playlist ownership through playlist_items
    const { data: playlistItem, error: verifyError } = await supabase
      .from("playlist_items")
      .select(`
        id,
        playlists!inner(user_id)
      `)
      .eq("id", playlist_item_id)
      .eq("playlists.user_id", user.id)
      .single()

    if (verifyError || !playlistItem) {
      return NextResponse.json({ error: "Playlist item not found or unauthorized" }, { status: 404 })
    }

    // Delete the playlist item
    const { error: deleteError } = await supabase.from("playlist_items").delete().eq("id", playlist_item_id)

    if (deleteError) {
      console.error("Database error:", deleteError)
      return NextResponse.json({ error: "Failed to delete playlist item" }, { status: 500 })
    }

    await supabase.from("playlists").update({ updated_at: new Date().toISOString() }).eq("id", params.id)

    const { data: screenPlaylists } = await supabase
      .from("screen_playlists")
      .select("screen_id")
      .eq("playlist_id", params.id)

    if (screenPlaylists && screenPlaylists.length > 0) {
      const screenIds = screenPlaylists.map((sp) => sp.screen_id)
      await supabase.from("screens").update({ updated_at: new Date().toISOString() }).in("id", screenIds)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting playlist item:", error)
    return NextResponse.json({ error: "Failed to delete playlist item" }, { status: 500 })
  }
}
