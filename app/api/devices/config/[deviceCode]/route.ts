import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

// Función para procesar URLs de Google Slides - añade parámetro rm=minimal para ocultar controles
function processGoogleSlidesUrl(filePath: string): string {
  if (!filePath) return filePath
  
  // Detectar si es una URL de Google Slides
  if (filePath.includes("docs.google.com/presentation")) {
    // Si ya tiene el parámetro rm=minimal, no agregarlo de nuevo
    if (filePath.includes("rm=minimal")) {
      return filePath
    }
    
    // Agregar el parámetro rm=minimal al final de la URL
    return filePath.includes("?") 
      ? `${filePath}&rm=minimal`
      : `${filePath}?rm=minimal`
  }
  
  return filePath
}

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
            file_path,
            mime_type,
            file_size,
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
          .select("id, name, file_path, mime_type, file_size, duration")
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
    // If content type is schedule, check for active schedule
    else if (screen.content_type === "schedule") {
      console.log("[v0] Content type is schedule, checking for active schedule for screen:", screen.id)

      const { data: screenSchedule, error: scheduleError } = await supabase
        .from("screen_schedules")
        .select(`
          schedule_id,
          schedules!screen_schedules_schedule_id_fkey (
            id,
            name,
            is_active
          )
        `)
        .eq("screen_id", screen.id)
        .eq("is_active", true)
        .maybeSingle()

      console.log("[v0] Screen schedule lookup:", { screenSchedule, scheduleError })

      const scheduleData = screenSchedule?.schedules

      if (scheduleData) {
        console.log("[v0] Active schedule found:", {
          scheduleId: scheduleData.id,
          scheduleName: scheduleData.name,
        })

        // Fetch schedule items
        const { data: scheduleItems, error: scheduleItemsError } = await supabase
          .from("schedule_items")
          .select(`
            id,
            start_time,
            end_time,
            days_of_week,
            playlist_id,
            playlists (
              id,
              name,
              is_active
            )
          `)
          .eq("schedule_id", scheduleData.id)

        console.log("[v0] Schedule items lookup:", { count: scheduleItems?.length, scheduleItemsError })

        if (!scheduleItemsError && scheduleItems && scheduleItems.length > 0) {
          // Determine which schedule item is active based on current time
          const now = new Date()
          const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
          const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

          const activeScheduleItem = scheduleItems.find((item) => {
            // Check if current day is in days_of_week array
            const daysActive = item.days_of_week && Array.isArray(item.days_of_week) && item.days_of_week.includes(currentDay)
            // Check if current time is between start_time and end_time
            const timeActive = currentTime >= item.start_time && currentTime <= item.end_time

            return daysActive && timeActive
          })

          console.log("[v0] Active schedule item:", activeScheduleItem)

          if (activeScheduleItem && activeScheduleItem.playlists) {
            // Load the playlist content from the active schedule item
            const playlistId = activeScheduleItem.playlist_id
            activePlaylist = activeScheduleItem.playlists

            console.log("[v0] Loading playlist from schedule:", {
              playlistId,
              playlistName: activePlaylist.name,
            })

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
                  file_path,
                  mime_type,
                  file_size,
                  duration
                )
              `)
              .eq("playlist_id", playlistId)
              .order("position")

            console.log("[v0] Playlist items from schedule:", { itemsCount: playlistItems?.length, itemsError })

            if (!itemsError && playlistItems) {
              playlistContent = playlistItems.filter((item) => item.media)
              console.log("[v0] Filtered playlist content count from schedule:", playlistContent.length)
            }
          } else {
            console.log("[v0] No active schedule item found for current time/day")
          }
        }
      } else {
        console.log("[v0] No active schedule found for screen")
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
              file_path,
              mime_type,
              file_size,
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

    // Transform content for Android app - match old API structure exactly
    const transformedContent = playlistContent
      .filter((item: any) => item.media) // Only include items with valid media
      .map((item: any) => {
        const mediaData = item.media
        
        return {
          id: item.id,
          position: item.position,
          duration_override: item.duration_override,
          transition_type: item.transition_type,
          transition_duration: item.transition_duration,
          media: {
            id: mediaData.id,
            name: mediaData.name,
            duration: mediaData.duration,
            file_path: processGoogleSlidesUrl(mediaData.file_path),
            file_size: mediaData.file_size,
            mime_type: mediaData.mime_type,
          }
        }
      })

    // Add screen-level display settings to playlist object for Android app compatibility
    const playlistWithSettings = activePlaylist ? {
      ...activePlaylist,
      background_color: screen.background_color || "#000000",
      scale_image: screen.scale_image || "fit",
      scale_video: screen.scale_video || "fit",
      scale_document: screen.scale_document || "fit",
      shuffle: screen.shuffle ?? false,
      default_transition: screen.default_transition || "fade",
    } : null

    // Fetch display branding setting from user's subscription plan
    let displayBranding = false
    try {
      // Get user from screen
      const { data: screenOwner } = await supabase
        .from("screens")
        .select("user_id")
        .eq("id", screen.id)
        .single()

      if (screenOwner?.user_id) {
        // Get user's subscription
        const { data: subscription } = await supabase
          .from("user_subscriptions")
          .select("plan_id")
          .eq("user_id", screenOwner.user_id)
          .eq("status", "active")
          .maybeSingle()

        if (subscription?.plan_id) {
          // Get the subscription plan with display_branding
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("display_branding")
            .eq("id", subscription.plan_id)
            .single()

          displayBranding = plan?.display_branding ?? false
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching display branding setting:", error)
      displayBranding = false
    }

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
        playlist: playlistWithSettings,
      },
      content: transformedContent,
      displayBranding: displayBranding,
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
