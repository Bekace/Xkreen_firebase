import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    // Check if user is super admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const isSuperAdmin = profile?.role === "super_admin"

    // Super admins have unlimited screens
    if (isSuperAdmin) {
      const { count: currentScreens } = await supabase
        .from("screens")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      return NextResponse.json({
        current: currentScreens || 0,
        limit: -1, // Unlimited
        canCreate: true,
        plan: "Super Admin",
      })
    }

    // Get current screen count
    const { count: currentScreens, error: countError } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (countError) {
      console.error("Error counting screens:", countError)
      return NextResponse.json({ error: "Failed to count screens" }, { status: 500 })
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
          max_screens
        )
      `,
      )
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    let maxScreens = 1 // Default Free plan limit
    let planName = "Free"

    if (!subError && subscription?.subscription_plans) {
      const plan = subscription.subscription_plans as { id: string; name: string; max_screens: number }
      maxScreens = plan.max_screens
      planName = plan.name
    } else {
      // No active subscription - check for Free plan limits
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("max_screens, name")
        .eq("name", "Free")
        .single()

      if (freePlan) {
        maxScreens = freePlan.max_screens
        planName = freePlan.name
      }
    }

    const canCreate = maxScreens === -1 || (currentScreens || 0) < maxScreens

    return NextResponse.json({
      current: currentScreens || 0,
      limit: maxScreens,
      canCreate,
      plan: planName,
    })
  } catch (error) {
    console.error("Error fetching screen limits:", error)
    return NextResponse.json({ error: "Failed to fetch screen limits" }, { status: 500 })
  }
}
