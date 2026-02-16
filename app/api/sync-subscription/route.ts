import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"

/**
 * Manual subscription sync endpoint - use if webhook fails
 * Call this after payment to force a subscription check
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const stripe = getStripe()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Manual sync for user:", user.id)

    // Get user's profile with stripe_customer_id
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer ID found" }, { status: 404 })
    }

    console.log("[v0] Fetching Stripe subscriptions for customer:", profile.stripe_customer_id)

    // Fetch all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 10,
    })

    console.log("[v0] Found", subscriptions.data.length, "subscriptions in Stripe")

    // Find the most recent active subscription
    const activeSubscription = subscriptions.data.find((sub) => sub.status === "active" || sub.status === "trialing")

    if (!activeSubscription) {
      console.log("[v0] No active subscription found in Stripe")
      return NextResponse.json({ message: "No active subscription found" }, { status: 404 })
    }

    console.log("[v0] Active subscription found:", activeSubscription.id)
    console.log("[v0] Metadata:", activeSubscription.metadata)

    const planId = activeSubscription.metadata?.plan_id
    const priceId = activeSubscription.metadata?.price_id

    if (!planId || !priceId) {
      console.log("[v0] Missing metadata in Stripe subscription")
      return NextResponse.json({ error: "Subscription missing metadata" }, { status: 400 })
    }

    // Check if user has a subscription record
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const now = new Date()

    if (existingSub) {
      console.log("[v0] Updating existing subscription record")

      const { data: updated, error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          plan_id: planId,
          price_id: priceId,
          stripe_subscription_id: activeSubscription.id,
          stripe_customer_id: profile.stripe_customer_id,
          status: activeSubscription.status,
          expires_at: new Date(activeSubscription.current_period_end * 1000).toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", existingSub.id)
        .select()
        .single()

      if (updateError) {
        console.error("[v0] Failed to update:", updateError)
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
      }

      console.log("[v0] ✅ Subscription synced successfully")
      return NextResponse.json({ message: "Subscription synced", subscription: updated })
    } else {
      console.log("[v0] Creating new subscription record")

      const { data: created, error: createError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: user.id,
          plan_id: planId,
          price_id: priceId,
          stripe_subscription_id: activeSubscription.id,
          stripe_customer_id: profile.stripe_customer_id,
          status: activeSubscription.status,
          started_at: now.toISOString(),
          expires_at: new Date(activeSubscription.current_period_end * 1000).toISOString(),
        })
        .select()
        .single()

      if (createError) {
        console.error("[v0] Failed to create:", createError)
        return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
      }

      console.log("[v0] ✅ Subscription created successfully")
      return NextResponse.json({ message: "Subscription created", subscription: created })
    }
  } catch (error) {
    console.error("[v0] Sync error:", error)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
