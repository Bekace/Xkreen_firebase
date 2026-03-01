import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

/**
 * POST /api/stripe/purchase-screen
 * Purchases one additional screen slot by incrementing the Stripe subscription
 * quantity by 1 with immediate proration.
 * Called when the user has used all free + previously purchased screen slots.
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get user's active subscription including plan free_screens
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(`
        id,
        stripe_subscription_id,
        status,
        subscription_plans (
          id,
          name,
          free_screens
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    if (subError || !subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 })
    }

    const plan = subscription.subscription_plans as { id: string; name: string; free_screens: number }
    const freeScreens = plan?.free_screens ?? 0

    // Count current screens
    const { count: totalScreens } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    const currentBillable = Math.max(0, (totalScreens ?? 0) - freeScreens)
    const newQuantity = currentBillable + 1

    // Retrieve Stripe subscription item
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
    const subscriptionItem = stripeSubscription.items.data[0]

    if (!subscriptionItem) {
      return NextResponse.json({ error: "No subscription item found" }, { status: 400 })
    }

    // Increment Stripe quantity by 1 with immediate proration
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{ id: subscriptionItem.id, quantity: newQuantity }],
      proration_behavior: "create_prorations",
    })

    return NextResponse.json({ success: true, newQuantity })
  } catch (err: any) {
    console.error("[v0] purchase-screen error:", err)
    return NextResponse.json({ error: err.message || "Failed to purchase screen slot" }, { status: 500 })
  }
}
