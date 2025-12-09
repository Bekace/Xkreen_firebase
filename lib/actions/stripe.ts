"use server"

import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function createCheckoutSession(planId: string) {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "You must be logged in to subscribe" }
  }

  // Get the selected plan with Stripe price ID
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .single()

  if (planError || !plan) {
    return { error: "Invalid plan selected" }
  }

  // Determine which Stripe price ID to use
  const stripePriceId = plan.billing_cycle === "monthly" ? plan.stripe_price_id_monthly : plan.stripe_price_id_yearly

  if (!stripePriceId) {
    return { error: "Plan does not have a Stripe price configured" }
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single()

  let customerId: string

  // Check if user already has a Stripe customer ID
  const { data: existingSubscription } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  if (existingSubscription?.stripe_customer_id) {
    customerId = existingSubscription.stripe_customer_id
  } else {
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: profile?.email || user.email,
      metadata: {
        user_id: user.id,
      },
    })
    customerId = customer.id

    // Update user_subscriptions with customer ID
    await supabase
      .from("user_subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", user.id)
      .eq("plan_id", planId)
  }

  // Create checkout session with 14-day trial
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-pointer-ai-landing-page-psi-six-73.vercel.app"}/auth/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-pointer-ai-landing-page-psi-six-73.vercel.app"}/auth/pricing`,
    metadata: {
      user_id: user.id,
      plan_id: planId,
    },
  })

  return { sessionId: session.id }
}

export async function createCustomerPortalSession() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get Stripe customer ID
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  if (!subscription?.stripe_customer_id) {
    return { error: "No active subscription found" }
  }

  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-pointer-ai-landing-page-psi-six-73.vercel.app"}/dashboard/settings/billing`,
  })

  redirect(session.url)
}
