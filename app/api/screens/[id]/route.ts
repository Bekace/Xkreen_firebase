import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: screen, error } = await supabase
      .from("screens")
      .select(`
        *,
        screen_playlists!left(
          playlist_id,
          is_active,
          playlists(id, name, description)
        ),
        screen_media!left(
          media_id,
          media(id, name, mime_type, file_path)
        ),
        media(id, name, mime_type, file_path)
      `)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    return NextResponse.json({ screen })
  } catch (error) {
    console.error("Error fetching screen:", error)
    return NextResponse.json({ error: "Failed to fetch screen" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestData = await request.json()
    const { name, location, resolution, orientation, selectedContentIds, content_type, enable_audio_management } =
      requestData

    console.log("[v0] Screen update request:")
    console.log(`[v0] - Screen ID: ${params.id}`)
    console.log(`[v0] - Content Type: ${content_type}`)
    console.log(`[v0] - Selected content IDs:`, selectedContentIds)

    const updateData: any = {
      name,
      location,
      resolution,
      orientation,
      updated_at: new Date().toISOString(),
    }

    if (enable_audio_management !== undefined) {
      updateData.enable_audio_management = enable_audio_management
    }

    const { error: deletePlaylistsError } = await supabase.from("screen_playlists").delete().eq("screen_id", params.id)
    const { error: deleteMediaError } = await supabase.from("screen_media").delete().eq("screen_id", params.id)

    console.log("[v0] - Deleted existing assignments")
    if (deletePlaylistsError) console.error("[v0] - Error deleting playlists:", deletePlaylistsError)
    if (deleteMediaError) console.error("[v0] - Error deleting media:", deleteMediaError)

    if (content_type === "playlist" && selectedContentIds && selectedContentIds.length > 0) {
      updateData.content_type = "playlist"
      updateData.media_id = null

      const playlistAssignment = {
        screen_id: params.id,
        playlist_id: selectedContentIds[0],
        is_active: true,
      }

      const { data: insertedPlaylist, error: playlistInsertError } = await supabase
        .from("screen_playlists")
        .insert([playlistAssignment])
        .select()

      console.log(`[v0] - Inserted playlist assignment:`, insertedPlaylist)
      if (playlistInsertError) {
        console.error("[v0] - Error inserting playlist:", playlistInsertError)
        return NextResponse.json(
          { error: "Failed to assign playlist: " + playlistInsertError.message },
          { status: 500 },
        )
      }
    } else if (content_type === "asset" && selectedContentIds && selectedContentIds.length > 0) {
      updateData.content_type = "asset"
      updateData.media_id = null

      console.log(`[v0] - Received ${selectedContentIds.length} media IDs:`, selectedContentIds)

      const mediaAssignments = selectedContentIds.map((mediaId: string) => ({
        screen_id: params.id,
        media_id: mediaId,
      }))

      console.log(`[v0] - Created ${mediaAssignments.length} media assignments to insert:`, mediaAssignments)

      const { data: insertedMedia, error: mediaInsertError } = await supabase
        .from("screen_media")
        .insert(mediaAssignments)
        .select()

      console.log(`[v0] - Inserted ${insertedMedia?.length || 0} media assignments, data:`, insertedMedia)
      if (mediaInsertError) {
        console.error("[v0] - Error inserting media:", mediaInsertError)
        return NextResponse.json({ error: "Failed to assign media: " + mediaInsertError.message }, { status: 500 })
      }
    } else if (content_type === "schedule") {
      updateData.content_type = "schedule"
      updateData.media_id = null
      // TODO: Schedule logic placeholder
    } else {
      updateData.content_type = "none"
      updateData.media_id = null
    }

    const { data: screen, error: updateError } = await supabase
      .from("screens")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json({ error: "Failed to update screen" }, { status: 500 })
    }

    const { data: updatedScreen, error: fetchError } = await supabase
      .from("screens")
      .select(`
        *,
        media(id, name, mime_type, file_path),
        screen_playlists!left(
          playlist_id,
          is_active,
          playlists(id, name, description)
        ),
        screen_media!left(
          media_id,
          media(id, name, mime_type, file_path)
        )
      `)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ screen })
    }

    return NextResponse.json({ screen: updatedScreen })
  } catch (error) {
    console.error("Error updating screen:", error)
    return NextResponse.json({ error: "Failed to update screen" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase.from("screens").delete().eq("id", params.id).eq("user_id", user.id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to delete screen" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting screen:", error)
    return NextResponse.json({ error: "Failed to delete screen" }, { status: 500 })
  }
}
