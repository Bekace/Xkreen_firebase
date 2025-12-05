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
    const { name, location, resolution, orientation, selectedContentIds, content_type, contentType } = requestData
    const finalContentType = content_type || contentType

    console.log("[v0] Screen update request:")
    console.log(`[v0] - Screen ID: ${params.id}`)
    console.log(`[v0] - Content Type: ${finalContentType}`)
    console.log(`[v0] - Selected content IDs:`, selectedContentIds)

    const updateData: any = {
      name,
      location,
      resolution,
      orientation,
      updated_at: new Date().toISOString(),
    }

    await supabase.from("screen_playlists").delete().eq("screen_id", params.id)
    await supabase.from("screen_media").delete().eq("screen_id", params.id)

    if (finalContentType === "schedule") {
      updateData.content_type = "schedule"
      updateData.media_id = null
    } else if (finalContentType === "playlist" && selectedContentIds && selectedContentIds.length > 0) {
      const playlistId = selectedContentIds[0]
      const { data: insertedPlaylist, error: playlistInsertError } = await supabase
        .from("screen_playlists")
        .insert({
          screen_id: params.id,
          playlist_id: playlistId,
          is_active: true,
        })
        .select()

      if (playlistInsertError) {
        console.error("[v0] Failed to insert playlist assignment:", playlistInsertError)
        return NextResponse.json(
          { error: "Failed to assign playlist", details: playlistInsertError.message },
          { status: 500 },
        )
      }

      updateData.content_type = "playlist"
      updateData.media_id = null
      console.log(`[v0] - Successfully assigned playlist: ${playlistId}`, insertedPlaylist)
    } else if (finalContentType === "asset" && selectedContentIds && selectedContentIds.length > 0) {
      const mediaAssignments = selectedContentIds.map((mediaId: string) => ({
        screen_id: params.id,
        media_id: mediaId,
      }))
      const { data: insertedMedia, error: mediaInsertError } = await supabase
        .from("screen_media")
        .insert(mediaAssignments)
        .select()

      if (mediaInsertError) {
        console.error("[v0] Failed to insert media assignments:", mediaInsertError)
        return NextResponse.json(
          { error: "Failed to assign media assets", details: mediaInsertError.message },
          { status: 500 },
        )
      }

      updateData.content_type = "asset"
      updateData.media_id = selectedContentIds[0]
      console.log(`[v0] - Successfully assigned ${insertedMedia?.length || 0} media assets`)
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
