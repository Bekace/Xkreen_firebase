import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Fetching playlist limits...")
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

    console.log("[v0] User ID:", user.id)

    // Get user's current playlist count
    const { count: currentCount, error: countError } = await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (countError) {
      console.error("Error counting playlists:", countError)
      return NextResponse.json({ error: "Failed to count playlists" }, { status: 500 })
    }

    console.log("[v0] Current playlist count:", currentCount)

    const { data: userData, error: userError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    console.log("[v0] User profile data:", { userData, userError })

    if (userError) {
      console.error("Error fetching user data:", userError)
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 })
    }

    let maxPlaylists: number
    let subscriptionData: any = null

    // Check if user is super admin first
    if (userData?.role === "super_admin") {
      console.log("[v0] User is super admin, granting unlimited playlists")
      maxPlaylists = -1
    } else {
      const { data: subscriptionResult, error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .select("status, plan_id")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle()

      console.log("[v0] User subscription query result:", { subscriptionResult, subscriptionError })

      if (subscriptionResult && subscriptionResult.plan_id) {
        const { data: planData, error: planError } = await supabase
          .from("subscription_plans")
          .select("name, max_playlists")
          .eq("id", subscriptionResult.plan_id)
          .eq("is_active", true)
          .single()

        console.log("[v0] Plan data query result:", { planData, planError })

        if (planData && !planError) {
          subscriptionData = { ...subscriptionResult, subscription_plans: planData }
          maxPlaylists = planData.max_playlists
          console.log("[v0] Using active subscription max_playlists:", maxPlaylists)
        } else {
          console.log("[v0] Plan not found or inactive, using Free plan")
          const { data: freePlan, error: freePlanError } = await supabase
            .from("subscription_plans")
            .select("max_playlists, name")
            .eq("is_active", true)
            .order("max_playlists", { ascending: true })
            .limit(1)
            .maybeSingle()

          console.log("[v0] Free plan query result:", { freePlan, freePlanError })

          if (freePlanError) {
            console.error("Error fetching Free plan:", freePlanError)
            return NextResponse.json({ error: "Failed to fetch plan data" }, { status: 500 })
          }

          maxPlaylists = freePlan?.max_playlists || 2 // Fallback to 2 if no plan found
          console.log("[v0] Using Free plan max_playlists from database:", maxPlaylists)
        }
      } else {
        console.log("[v0] No active subscription found, using Free plan")
        const { data: freePlan, error: freePlanError } = await supabase
          .from("subscription_plans")
          .select("max_playlists, name")
          .eq("is_active", true)
          .order("max_playlists", { ascending: true })
          .limit(1)
          .maybeSingle()

        console.log("[v0] Free plan query result:", { freePlan, freePlanError })

        if (freePlanError) {
          console.error("Error fetching Free plan:", freePlanError)
          return NextResponse.json({ error: "Failed to fetch plan data" }, { status: 500 })
        }

        maxPlaylists = freePlan?.max_playlists || 2 // Fallback to 2 if no plan found
        console.log("[v0] Using Free plan max_playlists from database:", maxPlaylists)
      }
    }

    const canCreate = maxPlaylists === -1 || (currentCount || 0) < maxPlaylists

    console.log("[v0] Playlist limits calculated:", {
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
      hasSubscription: !!subscriptionData,
    })

    return NextResponse.json({
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
    })
  } catch (error) {
    console.error("Error checking playlist limits:", error)
    return NextResponse.json({ error: "Failed to check playlist limits" }, { status: 500 })
  }
}
