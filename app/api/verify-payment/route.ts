import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  console.log("[v0] verify-payment called")
  
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[v0] Verifying payment for user:", user.id)

  try {
    const stripe = getStripe()

    // Get user's stripe customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      console.log("[v0] No stripe customer ID found")
      return NextResponse.json({ error: "No customer ID" }, { status: 400 })
    }

    console.log("[v0] Fetching subscriptions for customer:", profile.stripe_customer_id)

    // Fetch all active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      console.log("[v0] No active subscriptions found in Stripe")
      return NextResponse.json({ updated: false, message: "No active subscription" })
    }

    const subscription = subscriptions.data[0]
    console.log("[v0] Found active Stripe subscription:", subscription.id)
    console.log("[v0] Metadata:", subscription.metadata)

    const planId = subscription.metadata?.plan_id
    const priceId = subscription.metadata?.price_id

    if (!planId || !priceId) {
      console.error("[v0] Subscription missing metadata")
      return NextResponse.json({ error: "Invalid subscription metadata" }, { status: 400 })
    }

    console.log("[v0] Updating database with plan:", planId, "price:", priceId)

    // Check if user_subscription exists
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const now = new Date()

    if (existingSub) {
      // Update existing
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          plan_id: planId,
          price_id: priceId,
          stripe_subscription_id: subscription.id,
          status: "active",
          updated_at: now.toISOString(),
        })
        .eq("id", existingSub.id)

      if (updateError) {
        console.error("[v0] Update error:", updateError)
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
      }

      console.log("[v0] ✅ Subscription updated successfully")
    } else {
      // Create new
      const { error: insertError } = await supabase.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: planId,
        price_id: priceId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: profile.stripe_customer_id,
        status: "active",
        started_at: now.toISOString(),
        expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })

      if (insertError) {
        console.error("[v0] Insert error:", insertError)
        return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
      }

      console.log("[v0] ✅ Subscription created successfully")
    }

    return NextResponse.json({ updated: true, plan_id: planId })
  } catch (error) {
    console.error("[v0] Verify payment error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
