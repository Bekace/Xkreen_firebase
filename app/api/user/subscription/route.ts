import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(
        `
        id,
        status,
        subscription_plans (
          id,
          name,
          max_screens,
          max_playlists,
          max_media_storage,
          max_analytics_screens,
          max_team_members
        )
      `
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (subError) {
      console.error("[v0] Error fetching subscription:", subError)
    }

    // If no active subscription, return Free plan info
    if (!subscription) {
      return NextResponse.json({
        subscription: {
          plan: {
            name: "Free",
            max_screens: 3,
            max_playlists: 5,
            max_media_storage: 1073741824, // 1GB
            max_analytics_screens: 0,
            max_team_members: 0,
          },
        },
      })
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.subscription_plans,
      },
    })
  } catch (error) {
    console.error("[v0] Subscription API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
