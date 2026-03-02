import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

/**
 * POST /api/stripe/purchase-screen
 * Creates a Stripe Checkout Session for purchasing one additional screen slot.
 * The user is redirected to Stripe's hosted checkout page to complete payment.
 * On success, Stripe redirects back to /dashboard/screens?purchase=success.
 * The webhook handles crediting the purchased_screen_slots in DB.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get user's active subscription with plan and price details
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(`
        id,
        stripe_subscription_id,
        stripe_customer_id,
        price_id,
        status,
        subscription_plans (
          id,
          name,
          free_screens,
          price,
          billing_cycle
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 })
    }

    const plan = subscription.subscription_plans as {
      id: string
      name: string
      free_screens: number
      price: number
      billing_cycle: string
    }

    // Determine base URL for redirect
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Create a Stripe Checkout Session for the additional screen slot.
    // We use the existing price_id so the charge matches the user's current plan pricing.
    // metadata.type = "screen_slot" lets the webhook identify and credit this purchase.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: subscription.stripe_customer_id ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Additional Screen Slot",
              description: `One additional screen slot on your ${plan.name} plan`,
            },
            unit_amount: Math.round(Number(plan.price) * 100), // convert dollars to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/screens?purchase=success`,
      cancel_url: `${origin}/dashboard/screens`,
      metadata: {
        type: "screen_slot",
        user_id: user.id,
        subscription_id: subscription.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("[purchase-screen] error:", err)
    return NextResponse.json({ error: err.message || "Failed to create checkout session" }, { status: 500 })
  }
}
