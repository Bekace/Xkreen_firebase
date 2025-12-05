import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest, { params }: { params: { screenCode: string } }) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { screenCode } = params

    if (!screenCode) {
      return NextResponse.json({ error: "Screen code is required" }, { status: 400 })
    }

    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("*")
      .eq("screen_code", screenCode)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    let content: any[] = []

    if (screen.content_type === "playlist") {
      // Fetch single playlist assignment
      const { data: screenPlaylists } = await supabase
        .from("screen_playlists")
        .select(`
          playlist:playlists(
            *,
            playlist_items(
              *,
              media(*)
            )
          )
        `)
        .eq("screen_id", screen.id)
        .eq("is_active", true)

      console.log(`[v0] Playlist mode - Found ${screenPlaylists?.length || 0} playlists`)

      if (screenPlaylists && screenPlaylists.length > 0) {
        const playlist = screenPlaylists[0].playlist
        if (playlist?.playlist_items) {
          content = playlist.playlist_items
            .sort((a: any, b: any) => a.position - b.position)
            .map((item: any) => ({
              id: item.media?.id,
              name: item.media?.name,
              type: item.media?.mime_type,
              url: item.media?.file_path,
              thumbnail: item.media?.thumbnail_path,
              media: item.media,
              duration_override: item.duration_override || playlist.default_duration || 10,
              transition_type: item.transition_type || playlist.transition_type || "fade",
              transition_duration: item.transition_duration || playlist.transition_duration || 0.8,
            }))

          // Apply playlist settings to screen
          screen.background_color = screen.background_color || playlist.background_color
          screen.scale_image = screen.scale_image || playlist.scale_image || "fit"
          screen.scale_video = screen.scale_video || playlist.scale_video || "fit"
          screen.shuffle = playlist.shuffle || false

          console.log(`[v0] Loaded ${content.length} items from playlist "${playlist.name}"`)
        }
      }
    } else if (screen.content_type === "asset") {
      // Fetch multiple media assets
      const { data: screenMedia } = await supabase
        .from("screen_media")
        .select(`
          media(*)
        `)
        .eq("screen_id", screen.id)

      console.log(`[v0] Asset mode - Found ${screenMedia?.length || 0} media items`)

      if (screenMedia && screenMedia.length > 0) {
        content = screenMedia.map((sm: any) => ({
          id: sm.media?.id,
          name: sm.media?.name,
          type: sm.media?.mime_type,
          url: sm.media?.file_path,
          thumbnail: sm.media?.thumbnail_path,
          media: sm.media,
          duration_override: screen.default_duration || 10,
          transition_type: screen.transition_type || "fade",
          transition_duration: screen.transition_duration || 0.8,
        }))

        console.log(`[v0] Loaded ${content.length} media assets`)
      }
    }

    if (screen.shuffle && content.length > 1) {
      content = content.sort(() => Math.random() - 0.5)
    }

    console.log(`[v0] Final content count: ${content.length}`)
    console.log(
      `[v0] Content details:`,
      content.map((c) => ({ id: c.id, name: c.name, type: c.type, hasUrl: !!c.url })),
    )

    return NextResponse.json(
      {
        screen: {
          ...screen,
          content,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Config API error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
