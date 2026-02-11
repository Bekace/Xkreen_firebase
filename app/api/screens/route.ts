import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

function isScreenOffline(lastSeen: string | null): boolean {
  if (!lastSeen) return true
  const lastSeenDate = new Date(lastSeen)
  const now = new Date()
  return now.getTime() - lastSeenDate.getTime() > OFFLINE_THRESHOLD_MS
}

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: screens, error } = await supabase
      .from("screens")
      .select(`
        *,
        screen_playlists(
          playlist_id,
          is_active,
          playlists(id, name)
        ),
        screen_media(
          media_id,
          media(id, name, mime_type, file_path)
        ),
        screen_schedules(
          schedule_id,
          is_active,
          schedules(id, name)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch screens" }, { status: 500 })
    }

    const screensWithUpdatedStatus = screens?.map((screen) => {
      const shouldBeOffline = isScreenOffline(screen.last_seen)
      if (shouldBeOffline && screen.status === "online") {
        // Update status in background (don't wait for it)
        supabase
          .from("screens")
          .update({ status: "offline" })
          .eq("id", screen.id)
          .then(() => {})
        return { ...screen, status: "offline" }
      }
      return screen
    })

    return NextResponse.json({ screens: screensWithUpdatedStatus })
  } catch (error) {
    console.error("Error listing screens:", error)
    return NextResponse.json({ error: "Failed to list screens" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is super admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const isSuperAdmin = profile?.role === "super_admin"

    if (!isSuperAdmin) {
      // Get current screen count
      const { count: currentScreens } = await supabase
        .from("screens")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      // Get user's active subscription or default to Free plan
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select(
          `
          subscription_plans (
            max_screens,
            name
          )
        `,
        )
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .single()

      let maxScreens = 1 // Default Free plan limit

      if (subscription?.subscription_plans) {
        const plan = subscription.subscription_plans as { max_screens: number; name: string }
        maxScreens = plan.max_screens
      } else {
        // No active subscription - use Free plan limits
        const { data: freePlan } = await supabase
          .from("subscription_plans")
          .select("max_screens")
          .eq("name", "Free")
          .single()

        if (freePlan) {
          maxScreens = freePlan.max_screens
        }
      }

      // Check if limit reached (unlimited = -1)
      if (maxScreens !== -1 && (currentScreens || 0) >= maxScreens) {
        return NextResponse.json(
          {
            error: "Screen limit reached",
            message: `Your current plan allows ${maxScreens} screen${maxScreens > 1 ? "s" : ""}. Please upgrade to create more screens.`,
          },
          { status: 403 },
        )
      }
    }

    const { 
      name, 
      location, 
      resolution, 
      orientation, 
      content_type, 
      enable_audio_management,
      shuffle,
      is_active,
      scale_image,
      scale_video,
      scale_document,
      background_color,
      default_transition
    } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Screen name is required" }, { status: 400 })
    }

    // Generate unique screen code
    const screenCode = `SCR-${Date.now().toString(36).toUpperCase()}`

    // Create new screen
    const { data: screen, error } = await supabase
      .from("screens")
      .insert({
        user_id: user.id,
        name,
        location,
        resolution,
        orientation,
        screen_code: screenCode,
        status: "offline",
        content_type: content_type || "none",
        enable_audio_management: enable_audio_management ?? false,
        shuffle: shuffle ?? false,
        is_active: is_active ?? true,
        scale_image: scale_image || "fit",
        scale_video: scale_video || "fit",
        scale_document: scale_document || "fit",
        background_color: background_color || "#000000",
        default_transition: default_transition || "fade",
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create screen" }, { status: 500 })
    }

    return NextResponse.json({ screen })
  } catch (error) {
    console.error("Error creating screen:", error)
    return NextResponse.json({ error: "Failed to create screen" }, { status: 500 })
  }
}
