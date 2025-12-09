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
    let mostRecentUpdate = screen.updated_at

    if (screen.content_type === "playlist") {
      const { data: screenPlaylists } = await supabase
        .from("screen_playlists")
        .select(
          `
          playlist_id,
          playlists (
            id,
            name,
            updated_at,
            playlist_items (
              id,
              position,
              duration_override,
              transition_type,
              transition_duration,
              media (
                id,
                name,
                file_path,
                thumbnail_path,
                mime_type
              )
            )
          )
        `,
        )
        .eq("screen_id", screen.id)

      if (screenPlaylists && screenPlaylists.length > 0) {
        const playlist = screenPlaylists[0].playlists as any

        if (playlist?.updated_at && playlist.updated_at > mostRecentUpdate) {
          mostRecentUpdate = playlist.updated_at
        }

        if (playlist?.playlist_items) {
          const items = playlist.playlist_items.sort((a: any, b: any) => a.position - b.position)

          items.forEach((item: any) => {
            if (item.updated_at && item.updated_at > mostRecentUpdate) {
              mostRecentUpdate = item.updated_at
            }
          })

          content = items
            .filter((item: any) => item.media)
            .map((item: any) => ({
              id: item.media.id,
              name: item.media.name,
              type: item.media.mime_type,
              url: item.media.file_path,
              thumbnail: item.media.thumbnail_path,
              media: item.media,
              duration_override: item.duration_override || 10,
              transition_type: item.transition_type || "fade",
              transition_duration: item.transition_duration || 0.8,
            }))
        }
      }
    } else if (screen.content_type === "asset") {
      const { data: screenMedia } = await supabase
        .from("screen_media")
        .select(
          `
          id,
          media (
            id,
            name,
            file_path,
            thumbnail_path,
            mime_type
          )
        `,
        )
        .eq("screen_id", screen.id)

      if (screenMedia) {
        content = screenMedia
          .filter((sm: any) => sm.media)
          .map((sm: any) => ({
            id: sm.media.id,
            name: sm.media.name,
            type: sm.media.mime_type,
            url: sm.media.file_path,
            thumbnail: sm.media.thumbnail_path,
            media: sm.media,
            duration_override: 10,
            transition_type: "fade",
            transition_duration: 0.8,
          }))
      }
    }

    if (screen.shuffle && content.length > 1) {
      content = content.sort(() => Math.random() - 0.5)
    }

    return NextResponse.json(
      {
        screen: {
          ...screen,
          updated_at: mostRecentUpdate,
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
    console.error(`Config API error:`, error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
