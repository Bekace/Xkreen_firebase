"use server"

import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function createCheckoutSession(planId: string, priceId: string) {
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

  const { data: price, error: priceError } = await supabase
    .from("subscription_prices")
    .select("*")
    .eq("id", priceId)
    .single()

  if (priceError || !price || !price.stripe_price_id) {
    return { error: "Invalid price selected" }
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
        price: price.stripe_price_id,
        quantity: 1,
      },
    ],
    mode: "subscription",
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        price_id: priceId,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/auth/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/auth/pricing`,
    metadata: {
      user_id: user.id,
      plan_id: planId,
      price_id: priceId,
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
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .single()

  if (!subscription?.stripe_customer_id) {
    return { error: "No active subscription found" }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/dashboard/settings/billing`,
    // Configure what features are available in the portal
    flow_data: {
      type: "subscription_cancel",
      subscription_cancel: {
        subscription: subscription.stripe_subscription_id,
      },
    },
  })

  redirect(session.url)
}

export async function createUpgradeCheckoutSession(planId: string, priceId: string) {
  const supabase = await createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "You must be logged in to upgrade" }
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

  // Get the selected price
  const { data: price, error: priceError } = await supabase
    .from("subscription_prices")
    .select("*")
    .eq("id", priceId)
    .single()

  if (priceError || !price || !price.stripe_price_id) {
    return { error: "Invalid price selected" }
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
    if (existingSubscription) {
      await supabase.from("user_subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", user.id)
    }
  }

  // Create checkout session for upgrade (no trial for upgrades)
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: price.stripe_price_id,
        quantity: 1,
      },
    ],
    mode: "subscription",
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan_id: planId,
        price_id: priceId,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/dashboard/settings/billing?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/dashboard/settings/billing`,
    metadata: {
      user_id: user.id,
      plan_id: planId,
      price_id: priceId,
    },
  })

  if (!session.url) {
    return { error: "Failed to create checkout session" }
  }

  redirect(session.url)
}

export async function cancelSubscription(reason?: string, feedback?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get Stripe subscription ID
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single()

  if (!subscription?.stripe_subscription_id) {
    return { error: "No active subscription found" }
  }

  try {
    // Cancel at period end (recommended)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
      cancellation_details: {
        comment: feedback || "User requested cancellation",
        feedback: reason as any,
      },
    })

    // Update local database
    await supabase
      .from("user_subscriptions")
      .update({
        cancel_at_period_end: true,
        cancellation_reason: reason,
      })
      .eq("user_id", user.id)
      .eq("stripe_subscription_id", subscription.stripe_subscription_id)

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Cancel subscription error:", error)
    return { error: error.message || "Failed to cancel subscription" }
  }
}

export async function reactivateSubscription() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get Stripe subscription ID
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("stripe_subscription_id, cancel_at_period_end")
    .eq("user_id", user.id)
    .single()

  if (!subscription?.stripe_subscription_id) {
    return { error: "No subscription found" }
  }

  if (!subscription.cancel_at_period_end) {
    return { error: "Subscription is not scheduled for cancellation" }
  }

  try {
    // Reactivate the subscription
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    // Update local database
    await supabase
      .from("user_subscriptions")
      .update({
        cancel_at_period_end: false,
        cancellation_reason: null,
      })
      .eq("user_id", user.id)
      .eq("stripe_subscription_id", subscription.stripe_subscription_id)

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Reactivate subscription error:", error)
    return { error: error.message || "Failed to reactivate subscription" }
  }
}
