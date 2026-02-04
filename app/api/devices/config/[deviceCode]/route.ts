import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    const { deviceCode } = params

    console.log("[v0] Device config API called for:", deviceCode)

    if (!deviceCode) {
      return NextResponse.json({ error: "Device code is required" }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)
      .maybeSingle()

    console.log("[v0] Device lookup result:", { device, deviceError })

    if (deviceError || !device) {
      console.log("[v0] Device not found for code:", deviceCode)
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    if (!device.screen_id) {
      console.log("[v0] Device not paired to screen:", deviceCode)
      return NextResponse.json({ error: "Device not paired to screen" }, { status: 404 })
    }

    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("id, name, orientation, status, media_id, content_type, enable_audio_management, shuffle, is_active, scale_image, scale_video, scale_document, background_color, default_transition")
      .eq("id", device.screen_id)
      .single()

    console.log("[v0] Screen lookup result:", { screen, screenError })

    console.log("[v0] Screen details - media_id:", screen?.media_id, "content_type:", screen?.content_type)

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    let playlistContent = []
    let activePlaylist = null

    if (screen.content_type === "asset") {
      console.log("[v0] Checking screen_media for multiple assets for screen:", screen.id)

      const { data: screenMedia, error: mediaError } = await supabase
        .from("screen_media")
        .select(`
          id,
          media (
            id,
            name,
            url,
            type,
            size,
            duration
          )
        `)
        .eq("screen_id", screen.id)

      console.log("[v0] Screen media lookup:", { count: screenMedia?.length, mediaError })

      if (!mediaError && screenMedia && screenMedia.length > 0) {
        playlistContent = screenMedia
          .filter((sm) => sm.media)
          .map((sm, index) => ({
            id: `asset-${sm.media.id}`,
            position: index + 1,
            duration_override: null,
            transition_type: null,
            transition_duration: null,
            media: sm.media,
          }))

        // Create a virtual playlist for multiple assets display
        activePlaylist = {
          id: `asset-playlist-${screen.id}`,
          name: `Assets for ${screen.name}`,
          is_active: true,
        }

        console.log("[v0] Loaded multiple assets from screen_media:", playlistContent.length)
      } else if (screen.media_id) {
        // Fallback to legacy single media_id if screen_media is empty
        console.log("[v0] No screen_media entries, falling back to legacy media_id:", screen.media_id)

        const { data: mediaItem, error: singleMediaError } = await supabase
          .from("media")
          .select("id, name, url, type, size, duration")
          .eq("id", screen.media_id)
          .single()

        console.log("[v0] Legacy media item lookup:", { mediaItem, singleMediaError })

        if (!singleMediaError && mediaItem) {
          playlistContent = [
            {
              id: `asset-${mediaItem.id}`,
              position: 1,
              duration_override: null,
              transition_type: null,
              transition_duration: null,
              media: mediaItem,
            },
          ]

          activePlaylist = {
            id: `asset-playlist-${screen.id}`,
            name: `Asset: ${mediaItem.name}`,
            is_active: true,
          }
        }
      }
    }
    // If content type is playlist, check for active playlist
    else if (screen.content_type === "playlist" || !screen.content_type) {
      console.log("[v0] Content type is playlist, checking for active playlist for screen:", screen.id)

      const { data: screenPlaylist, error: playlistError } = await supabase
        .from("screen_playlists")
        .select(`
          playlist_id,
          playlists!screen_playlists_playlist_id_fkey (
            id,
            name,
            is_active
          )
        `)
        .eq("screen_id", screen.id)
        .eq("is_active", true)
        .maybeSingle()

      console.log("[v0] Screen playlist lookup:", { screenPlaylist, playlistError })

      const playlistData = screenPlaylist?.playlists

      if (playlistData) {
        activePlaylist = playlistData

        console.log("[v0] Active playlist found:", {
          playlistId: activePlaylist.id,
          playlistName: activePlaylist.name,
        })

        console.log("[v0] Found active playlist, fetching items for playlist_id:", activePlaylist.id)

        const { data: playlistItems, error: itemsError } = await supabase
          .from("playlist_items")
          .select(`
            id,
            position,
            duration_override,
            transition_type,
            transition_duration,
            media (
              id,
              name,
              url,
              type,
              size,
              duration
            )
          `)
          .eq("playlist_id", activePlaylist.id)
          .order("position")

        console.log("[v0] Playlist items lookup:", {
          itemsCount: playlistItems?.length,
          itemsError,
          items: playlistItems,
        })

        if (!itemsError && playlistItems) {
          playlistContent = playlistItems.filter((item) => item.media)
          console.log("[v0] Filtered playlist content count:", playlistContent.length)
        }
      } else {
        console.log("[v0] No active playlist found for screen")
      }
    }

    await supabase
      .from("devices")
      .update({
        is_paired: true,
        last_heartbeat: new Date().toISOString(),
      })
      .eq("id", device.id)

    console.log("[v0] Device config response:", {
      deviceId: device.id,
      screenId: screen.id,
      contentCount: playlistContent.length,
      hasPlaylist: !!activePlaylist,
      playlistId: activePlaylist?.id,
    })

    // Transform content for Android app - apply duration logic and map db fields to Android expected fields
    const transformedContent = playlistContent
      .filter((item: any) => item.media) // Only include items with valid media
      .map((item: any) => {
        const mediaData = item.media
        
        // Duration logic: use duration_override from playlist_items, else media.duration for videos, else 10 for images
        let duration = item.duration_override || 10
        if (mediaData.type?.startsWith('video/') && mediaData.duration) {
          duration = item.duration_override || mediaData.duration
        }
        
        return {
          id: mediaData.id,
          name: mediaData.name,
          duration: duration,
          position: item.position,
          transition_type: item.transition_type || screen.default_transition || "fade",
          transition_duration: item.transition_duration || 0.8,
          media: {
            file_path: mediaData.url,      // map db 'url' to Android 'file_path'
            mime_type: mediaData.type,     // map db 'type' to Android 'mime_type'
          }
        }
      })

    const responseData = {
      device: {
        id: device.id,
        device_code: device.device_code,
        is_paired: true,
        screen_id: device.screen_id,
      },
      screen: {
        id: screen.id,
        name: screen.name,
        orientation: screen.orientation,
        status: screen.status,
        enable_audio_management: screen.enable_audio_management ?? false,
        shuffle: screen.shuffle ?? false,
        is_active: screen.is_active ?? true,
        scale_image: screen.scale_image || "fit",
        scale_video: screen.scale_video || "fit",
        scale_document: screen.scale_document || "fit",
        background_color: screen.background_color || "#000000",
        default_transition: screen.default_transition || "fade",
        playlist: activePlaylist,
        content: transformedContent,
      },
    }

    const response = NextResponse.json(responseData)
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error) {
    console.error("Device config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
