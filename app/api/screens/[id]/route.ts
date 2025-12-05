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
    const { name, location, resolution, orientation, selectedContentIds } = requestData

    console.log("[v0] Screen update request:")
    console.log(`[v0] - Screen ID: ${params.id}`)
    console.log(`[v0] - Selected content IDs:`, selectedContentIds)

    const updateData: any = {
      name,
      location,
      resolution,
      orientation,
      updated_at: new Date().toISOString(),
    }

    if (selectedContentIds && Array.isArray(selectedContentIds)) {
      const { error: deletePlaylistsError } = await supabase
        .from("screen_playlists")
        .delete()
        .eq("screen_id", params.id)
      const { error: deleteMediaError } = await supabase.from("screen_media").delete().eq("screen_id", params.id)

      console.log("[v0] - Deleted existing assignments")
      if (deletePlaylistsError) console.error("[v0] - Error deleting playlists:", deletePlaylistsError)
      if (deleteMediaError) console.error("[v0] - Error deleting media:", deleteMediaError)

      if (selectedContentIds.length === 0) {
        updateData.media_id = null
        updateData.content_type = "none"
      } else {
        const { data: playlists } = await supabase
          .from("playlists")
          .select("id")
          .in("id", selectedContentIds)
          .eq("user_id", user.id)

        const playlistIds = playlists?.map((p) => p.id) || []
        const mediaIds = selectedContentIds.filter((id) => !playlistIds.includes(id))

        console.log(`[v0] - Detected ${playlistIds.length} playlists`)
        console.log(`[v0] - Detected ${mediaIds.length} media assets`)
        console.log(`[v0] - Playlist IDs:`, playlistIds)
        console.log(`[v0] - Media IDs:`, mediaIds)

        if (playlistIds.length > 0) {
          const playlistAssignments = playlistIds.map((playlistId) => ({
            screen_id: params.id,
            playlist_id: playlistId,
            is_active: true,
          }))
          const { data: insertedPlaylists, error: playlistInsertError } = await supabase
            .from("screen_playlists")
            .insert(playlistAssignments)
            .select()

          console.log(`[v0] - Inserted ${insertedPlaylists?.length || 0} playlist assignments`)
          if (playlistInsertError) console.error("[v0] - Error inserting playlists:", playlistInsertError)
        }

        if (mediaIds.length > 0) {
          const mediaAssignments = mediaIds.map((mediaId) => ({
            screen_id: params.id,
            media_id: mediaId,
          }))
          const { data: insertedMedia, error: mediaInsertError } = await supabase
            .from("screen_media")
            .insert(mediaAssignments)
            .select()

          console.log(`[v0] - Inserted ${insertedMedia?.length || 0} media assignments`)
          if (mediaInsertError) console.error("[v0] - Error inserting media:", mediaInsertError)
        }

        if (playlistIds.length > 0 && mediaIds.length > 0) {
          updateData.content_type = "mixed"
        } else if (playlistIds.length > 0) {
          updateData.content_type = "playlist"
        } else if (mediaIds.length > 0) {
          updateData.content_type = "asset"
        }

        updateData.media_id = mediaIds.length > 0 ? mediaIds[0] : null
      }
    }

    const { data: screen, error } = await supabase
      .from("screens")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
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
