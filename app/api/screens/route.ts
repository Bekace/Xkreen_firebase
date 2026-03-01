import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { syncStripeQuantityWithScreens } from "@/lib/actions/stripe"

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
      // New billing model: paid users have unlimited screens (billed per screen via Stripe).
      // Free plan users are still capped by max_screens.
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select(`
          status,
          subscription_plans (
            name,
            max_screens
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .single()

      const hasPaidSubscription = !!subscription
      const planName = (subscription?.subscription_plans as { name: string; max_screens: number } | null)?.name

      if (!hasPaidSubscription || planName === "Free") {
        // Fall back to max_screens cap for Free plan / no subscription
        const { count: currentScreens } = await supabase
          .from("screens")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)

        let maxScreens = 1 // default if nothing found

        if (subscription?.subscription_plans) {
          const plan = subscription.subscription_plans as { name: string; max_screens: number }
          maxScreens = plan.max_screens
        } else {
          const { data: freePlan } = await supabase
            .from("subscription_plans")
            .select("max_screens")
            .eq("name", "Free")
            .single()
          if (freePlan) maxScreens = freePlan.max_screens
        }

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
      // Paid plan users (non-Free) have unlimited screens — gating is done via Stripe billing
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

    // Sync Stripe subscription quantity (paid plans only).
    // If Stripe sync fails, roll back the screen insert to keep billing consistent.
    const syncResult = await syncStripeQuantityWithScreens(user.id)
    if (syncResult.error) {
      console.error("[v0] Stripe sync failed after screen insert, rolling back:", syncResult.error)
      // Roll back the screen we just created
      await supabase.from("screens").delete().eq("id", screen.id)
      return NextResponse.json(
        { error: "Failed to update billing. Screen was not created. Please try again." },
        { status: 500 },
      )
    }

    return NextResponse.json({ screen })
  } catch (error) {
    console.error("Error creating screen:", error)
    return NextResponse.json({ error: "Failed to create screen" }, { status: 500 })
  }
}
