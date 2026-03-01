"use server"

import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Syncs the Stripe subscription quantity to match the user's current screen count,
 * minus any free screens granted by their plan.
 *
 * Formula: stripe_quantity = max(0, total_screens - plan.free_screens)
 *
 * This is called after every screen create or delete.
 * Returns { success, billableScreens } or { error }.
 */
export async function syncStripeQuantityWithScreens(userId: string): Promise<{
  success?: boolean
  billableScreens?: number
  error?: string
}> {
  const supabase = await createClient()

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
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .single()

  if (subError || !subscription) {
    // No paid subscription — nothing to sync (Free plan users don't bill via Stripe)
    return { success: true, billableScreens: 0 }
  }

  if (!subscription.stripe_subscription_id) {
    return { success: true, billableScreens: 0 }
  }

  const plan = subscription.subscription_plans as { id: string; name: string; free_screens: number }
  const freeScreens = plan?.free_screens ?? 0

  // Count current total screens for this user
  const { count: totalScreens, error: countError } = await supabase
    .from("screens")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (countError) {
    return { error: "Failed to count screens" }
  }

  const billableScreens = Math.max(0, (totalScreens ?? 0) - freeScreens)

  try {
    // Retrieve the subscription to find the subscription item ID
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
    const subscriptionItem = stripeSubscription.items.data[0]

    if (!subscriptionItem) {
      return { error: "No subscription item found on Stripe subscription" }
    }

    // Update Stripe quantity with immediate proration
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [
        {
          id: subscriptionItem.id,
          quantity: billableScreens,
        },
      ],
      proration_behavior: "create_prorations",
    })

    return { success: true, billableScreens }
  } catch (err: any) {
    console.error("[v0] syncStripeQuantityWithScreens error:", err)
    return { error: err.message || "Failed to sync Stripe quantity" }
  }
}

/**
 * Purchases one additional screen slot by incrementing the Stripe subscription
 * quantity by 1 with immediate proration. This is called when the user has
 * used all their free + previously billed screen slots and clicks "Add Screen".
 * Returns { success, newQuantity } or { error }.
 */
export async function purchaseAdditionalScreen(): Promise<{
  success?: boolean
  newQuantity?: number
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "Not authenticated" }
  }

  // Get user's active subscription
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
    return { error: "No active subscription found" }
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

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
    const subscriptionItem = stripeSubscription.items.data[0]

    if (!subscriptionItem) {
      return { error: "No subscription item found" }
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{ id: subscriptionItem.id, quantity: newQuantity }],
      proration_behavior: "create_prorations",
    })

    return { success: true, newQuantity }
  } catch (err: any) {
    console.error("[v0] purchaseAdditionalScreen error:", err)
    return { error: err.message || "Failed to purchase screen slot" }
  }
}

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

  console.log("[v0] Creating upgrade checkout for:", { user_id: user.id, plan_id: planId, price_id: priceId, billing_cycle: price.billing_cycle })

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
        billing_cycle: price.billing_cycle,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/dashboard/settings/billing?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/dashboard/settings/billing`,
    metadata: {
      user_id: user.id,
      plan_id: planId,
      price_id: priceId,
      billing_cycle: price.billing_cycle,
    },
  })

  console.log("[v0] Checkout session created:", session.id)

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

export async function getInvoices() {
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
    return { error: "No customer found" }
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 12,
    })

    return {
      success: true,
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency,
        created: invoice.created,
        pdfUrl: invoice.invoice_pdf,
        hostedUrl: invoice.hosted_invoice_url,
      })),
    }
  } catch (error: any) {
    console.error("[v0] Get invoices error:", error)
    return { error: error.message || "Failed to fetch invoices" }
  }
}

export async function getPaymentMethods() {
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
    return { error: "No customer found" }
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscription.stripe_customer_id,
      type: "card",
    })

    // Get default payment method
    const customer = await stripe.customers.retrieve(subscription.stripe_customer_id)
    const defaultPaymentMethodId =
      typeof customer !== "deleted" && customer.invoice_settings?.default_payment_method
        ? customer.invoice_settings.default_payment_method
        : null

    return {
      success: true,
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId,
      })),
    }
  } catch (error: any) {
    console.error("[v0] Get payment methods error:", error)
    return { error: error.message || "Failed to fetch payment methods" }
  }
}

export async function setDefaultPaymentMethod(paymentMethodId: string) {
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
    return { error: "No customer found" }
  }

  try {
    await stripe.customers.update(subscription.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Set default payment method error:", error)
    return { error: error.message || "Failed to set default payment method" }
  }
}

export async function removePaymentMethod(paymentMethodId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    await stripe.paymentMethods.detach(paymentMethodId)
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Remove payment method error:", error)
    return { error: error.message || "Failed to remove payment method" }
  }
}

export async function createSetupIntent() {
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
    return { error: "No customer found" }
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: subscription.stripe_customer_id,
      payment_method_types: ["card"],
    })

    return { success: true, clientSecret: setupIntent.client_secret }
  } catch (error: any) {
    console.error("[v0] Create setup intent error:", error)
    return { error: error.message || "Failed to create setup intent" }
  }
}
