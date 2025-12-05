import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get playlist with media items for device player
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select(`
        id,
        name,
        background_color,
        playlist_media (
          id,
          duration,
          transition_type,
          transition_duration,
          order_index,
          media (
            id,
            filename,
            file_url,
            file_type,
            file_size
          )
        )
      `)
      .eq("id", id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
    }

    // Sort media by order_index
    const sortedMedia = playlist.playlist_media
      .sort((a, b) => a.order_index - b.order_index)
      .map((item) => ({
        id: item.media.id,
        filename: item.media.filename,
        fileUrl: item.media.file_url,
        fileType: item.media.file_type,
        duration: item.duration,
        transitionType: item.transition_type,
        transitionDuration: item.transition_duration,
      }))

    return NextResponse.json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        backgroundColor: playlist.background_color,
        media: sortedMedia,
      },
    })
  } catch (error) {
    console.error("Get playlist content error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
