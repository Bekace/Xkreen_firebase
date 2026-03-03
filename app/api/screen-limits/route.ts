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

    // Super admins have unlimited screens — no billing involved
    if (isSuperAdmin) {
      const { count: currentScreens } = await supabase
        .from("screens")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      return NextResponse.json({
        current: currentScreens || 0,
        limit: -1,
        canCreate: true,
        plan: "Super Admin",
        freeScreens: -1,
        billableScreens: 0,
        pricePerScreen: 0,
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

    // Get user's active subscription including plan details and purchased_screen_slots
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(`
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
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    const hasPaidSubscription = !subError && !!subscription
    const plan = subscription?.subscription_plans as {
      id: string
      name: string
      max_screens: number
      free_screens: number
    } | null

    const isPaidPlan = hasPaidSubscription && plan?.name !== "Free"

    if (isPaidPlan && plan) {
      const freeScreens = plan.free_screens ?? 0
      const billableScreens = Math.max(0, (currentScreens || 0) - freeScreens)

      // Read per-screen price from subscription_prices
      const { data: monthlyPriceRecord } = await supabase
        .from("subscription_prices")
        .select("price")
        .eq("plan_id", plan.id)
        .eq("billing_cycle", "monthly")
        .eq("is_active", true)
        .single()

      const pricePerScreen = Number(monthlyPriceRecord?.price) || 0

      const purchasedSlots = subscription?.purchased_screen_slots ?? 0
      const availableSlots = freeScreens + purchasedSlots - (currentScreens || 0)

      return NextResponse.json({
        current: currentScreens || 0,
        limit: -1,
        canCreate: true,
        plan: plan.name,
        freeScreens,
        billableScreens,
        pricePerScreen,
        billingCycle: "monthly",
        purchasedSlots,
        availableSlots,
      })
    }

    // Free plan or no subscription — enforce max_screens cap
    let maxScreens = 1
    let planName = "Free"
    let freeScreens = 0

    if (hasPaidSubscription && plan) {
      maxScreens = plan.max_screens
      planName = plan.name
      freeScreens = plan.free_screens ?? 0
    } else {
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("max_screens, name, free_screens")
        .eq("name", "Free")
        .single()

      if (freePlan) {
        maxScreens = freePlan.max_screens
        planName = freePlan.name
        freeScreens = freePlan.free_screens ?? 0
      }
    }

    const canCreate = maxScreens === -1 || (currentScreens || 0) < maxScreens

    return NextResponse.json({
      current: currentScreens || 0,
      limit: maxScreens,
      canCreate,
      plan: planName,
      freeScreens,
      billableScreens: 0,
      pricePerScreen: 0,
    })
  } catch (error) {
    console.error("Error fetching screen limits:", error)
    return NextResponse.json({ error: "Failed to fetch screen limits" }, { status: 500 })
  }
}
