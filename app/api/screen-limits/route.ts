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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    const isSuperAdmin = profile?.role === "super_admin"

    const { count: currentScreens, error: countError } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (countError) {
      console.error("Error counting screens:", countError)
      return NextResponse.json({ error: "Failed to count screens" }, { status: 500 })
    }

    if (isSuperAdmin) {
      return NextResponse.json({
        current: currentScreens || 0,
        limit: -1,
        availableSlots: 999, // Effectively infinite
        canCreate: true,
        plan: "Super Admin",
      })
    }

    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(
        `
        id,
        status,
        price_id,
        purchased_screen_slots,
        subscription_plans (
          id,
          name,
          max_screens,
          free_screens
        )
      `,
      )
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    const plan = subscription?.subscription_plans as {
      id: string
      name: string
      max_screens: number
      free_screens: number
    } | null

    const isPaidPlan = !subError && subscription && plan && plan.name !== "Free"

    if (isPaidPlan) {
      const freeScreens = plan.free_screens ?? 0
      const purchasedSlots = subscription.purchased_screen_slots ?? 0
      const totalSlots = freeScreens + purchasedSlots
      const availableSlots = Math.max(0, totalSlots - (currentScreens || 0))

      return NextResponse.json({
        current: currentScreens || 0,
        limit: totalSlots, // The effective limit is the sum of free and purchased
        availableSlots,
        canCreate: availableSlots > 0,
        plan: plan.name,
      })
    }

    // Free plan or no subscription logic
    let maxScreens = 1
    let planName = "Free"
    const { data: freePlan } = await supabase
      .from("subscription_plans")
      .select("max_screens, name")
      .eq("name", "Free")
      .single()

    if (freePlan) {
      maxScreens = freePlan.max_screens
      planName = freePlan.name
    }

    const availableSlots = Math.max(0, maxScreens - (currentScreens || 0))

    return NextResponse.json({
      current: currentScreens || 0,
      limit: maxScreens,
      availableSlots,
      canCreate: availableSlots > 0,
      plan: planName,
    })
  } catch (error) {
    console.error("Error fetching screen limits:", error)
    return NextResponse.json({ error: "Failed to fetch screen limits" }, { status: 500 })
  }
}
