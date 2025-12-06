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
      console.error(`[v0] Screen not found:`, screenError)
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    console.log(`[v0] Screen ${screenCode}: content_type = ${screen.content_type}`)

    let content: any[] = []
    let mostRecentUpdate = screen.updated_at

    if (screen.content_type === "asset") {
      // Fetch direct media assignments using raw SQL
      const { data: mediaItems, error: mediaError } = await supabase.rpc("get_screen_media", {
        p_screen_id: screen.id,
      })

      // Fallback to regular query if RPC doesn't exist
      if (mediaError) {
        console.log(`[v0] RPC not available, using regular query`)
        const { data: screenMedia } = await supabase
          .from("screen_media")
          .select("id, media_id, screen_id")
          .eq("screen_id", screen.id)

        if (screenMedia && screenMedia.length > 0) {
          const mediaIds = screenMedia.map((sm) => sm.media_id)
          const { data: mediaData } = await supabase.from("media").select("*").in("id", mediaIds)

          if (mediaData) {
            content = mediaData.map((media: any) => ({
              id: media.id,
              name: media.name,
              type: media.mime_type,
              url: media.file_path,
              thumbnail: media.thumbnail_path,
              media: media,
              duration_override: 10,
              transition_type: "fade",
              transition_duration: 0.8,
            }))
          }
        }
      }
    } else if (screen.content_type === "playlist") {
      const { data: screenPlaylists, error: playlistError } = await supabase
        .from("screen_playlists")
        .select("playlist_id")
        .eq("screen_id", screen.id)

      if (playlistError) {
        console.error(`[v0] Error fetching screen_playlists:`, playlistError)
      }

      console.log(`[v0] Found ${screenPlaylists?.length || 0} playlist assignments for screen ${screen.id}`)

      if (screenPlaylists && screenPlaylists.length > 0) {
        const playlistId = screenPlaylists[0].playlist_id
        console.log(`[v0] Fetching items for playlist ${playlistId}`)

        const { data: playlistData, error: playlistDataError } = await supabase
          .from("playlists")
          .select("updated_at")
          .eq("id", playlistId)
          .single()

        if (playlistDataError) {
          console.error(`[v0] Error fetching playlist data:`, playlistDataError)
        }

        if (playlistData?.updated_at && playlistData.updated_at > mostRecentUpdate) {
          mostRecentUpdate = playlistData.updated_at
        }

        // First get playlist item IDs and their media IDs
        const { data: playlistItems, error: itemsError } = await supabase
          .from("playlist_items")
          .select("id, position, duration_override, transition_type, transition_duration, media_id, updated_at")
          .eq("playlist_id", playlistId)
          .order("position")

        console.log(`[v0] Found ${playlistItems?.length || 0} playlist items`)

        if (playlistItems) {
          console.log(
            `[v0] Playlist items details:`,
            JSON.stringify(
              playlistItems.map((i) => ({ id: i.id, position: i.position, media_id: i.media_id })),
              null,
              2,
            ),
          )
        }

        if (itemsError) {
          console.error(`[v0] Error fetching playlist items:`, itemsError)
        }

        if (playlistItems && playlistItems.length > 0) {
          playlistItems.forEach((item) => {
            if (item.updated_at && item.updated_at > mostRecentUpdate) {
              mostRecentUpdate = item.updated_at
            }
          })

          // Then fetch the media data separately
          const mediaIds = playlistItems.map((item) => item.media_id).filter(Boolean)
          console.log(`[v0] Querying media for IDs:`, mediaIds)

          const { data: mediaData, error: mediaError } = await supabase.from("media").select("*").in("id", mediaIds)

          if (mediaError) {
            console.error(`[v0] Error fetching media:`, mediaError)
          }

          console.log(`[v0] Found ${mediaData?.length || 0} media items`)

          if (mediaData) {
            // Create a map for quick media lookup
            const mediaMap = new Map(mediaData.map((m) => [m.id, m]))

            // Combine playlist items with their media data
            content = playlistItems
              .map((item: any) => {
                const media = mediaMap.get(item.media_id)
                if (!media) {
                  console.log(`[v0] No media found for item ${item.id} with media_id ${item.media_id}`)
                  return null
                }

                console.log(`[v0] Adding item: ${media.name} (${media.mime_type})`)

                return {
                  id: media.id,
                  name: media.name,
                  type: media.mime_type,
                  url: media.file_path,
                  thumbnail: media.thumbnail_path,
                  media: media,
                  duration_override: item.duration_override || 10,
                  transition_type: item.transition_type || "fade",
                  transition_duration: item.transition_duration || 0.8,
                }
              })
              .filter(Boolean) // Remove nulls
          }
        }
      }
    }

    console.log(
      `[v0] Final content array for ${screenCode}:`,
      JSON.stringify(
        content.map((c) => ({ name: c.name, type: c.type })),
        null,
        2,
      ),
    )

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
    console.error(`[v0] Config API error:`, error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
