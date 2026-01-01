import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's playlists with media count
    const { data: playlists, error } = await supabase
      .from("playlists")
      .select(`
        *,
        playlist_items(count)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 })
    }

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error("Error listing playlists:", error)
    return NextResponse.json({ error: "Failed to list playlists" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's current playlist count
    const { count: currentCount, error: countError } = await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (countError) {
      console.error("Error counting playlists:", countError)
      return NextResponse.json({ error: "Failed to check playlist count" }, { status: 500 })
    }

    // Get user's subscription plan limits
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 })
    }

    let maxPlaylists: number

    // Super admins have unlimited playlists
    if (userData?.role === "super_admin") {
      maxPlaylists = -1
    } else {
      // Get user's active subscription
      const { data: subscriptionResult, error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .select(`
          status,
          subscription_plans!inner(
            max_playlists
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle()

      if (subscriptionResult && subscriptionResult.subscription_plans) {
        maxPlaylists = subscriptionResult.subscription_plans.max_playlists
      } else {
        // No active subscription, use Free plan
        const { data: freePlan } = await supabase
          .from("subscription_plans")
          .select("max_playlists")
          .eq("is_active", true)
          .order("max_playlists", { ascending: true })
          .limit(1)
          .maybeSingle()

        maxPlaylists = freePlan?.max_playlists || 2 // Default to 2 if no plan found
      }
    }

    // Check if user has reached their playlist limit
    if (maxPlaylists !== -1 && (currentCount || 0) >= maxPlaylists) {
      console.log(`[v0] Playlist limit reached: ${currentCount}/${maxPlaylists}`)
      return NextResponse.json(
        {
          error: `Playlist limit reached. You can only create ${maxPlaylists} playlists with your current plan. Please upgrade to create more playlists.`,
        },
        { status: 403 },
      )
    }

    const {
      name,
      description,
      scale_image = "fit",
      scale_video = "fit",
      scale_document = "fit",
      shuffle = false,
      default_transition = "fade",
    } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 })
    }

    // Create new playlist
    const { data: playlist, error } = await supabase
      .from("playlists")
      .insert({
        user_id: user.id,
        name,
        description,
        is_active: true,
        scale_image,
        scale_video,
        scale_document,
        shuffle,
        default_transition,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 })
    }

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error("Error creating playlist:", error)
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 })
  }
}
