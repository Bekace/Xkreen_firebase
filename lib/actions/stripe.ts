'use server'

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
  const { data: subscriptions, error: subError } = await supabase
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
    .limit(1)

  if (subError) {
    return { error: "Failed to retrieve subscription." }
  }
  const subscription = subscriptions?.[0]

  if (!subscription) {
    // No paid subscription — nothing to sync (Free plan users don't bill via Stripe)
    return { success: true, billableScreens: 0 }
  }

  if (!subscription.stripe_subscription_id) {
    return { success: true, billableScreens: 0 }
  }

  const plan = Array.isArray(subscription.subscription_plans)
    ? subscription.subscription_plans[0]
    : (subscription.subscription_plans as any)
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
  const { data: subscriptions, error: subError } = await supabase
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
    .limit(1)

  if (subError) {
    return { error: "Failed to retrieve subscription." }
  }
  const subscription = subscriptions?.[0]

  if (!subscription?.stripe_subscription_id) {
    return { error: "No active subscription found" }
  }

  const plan = Array.isArray(subscription.subscription_plans)
    ? subscription.subscription_plans[0]
    : (subscription.subscription_plans as any)
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "You must be logged in to subscribe" }
  }

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

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single()

  const { data: subscriptions } = await supabase
    .from("user_subscriptions")
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .limit(1)

  let customerId = subscriptions?.[0]?.stripe_customer_id
  const subscriptionId = subscriptions?.[0]?.id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id

    if (subscriptionId) {
      await supabase.from("user_subscriptions").update({ stripe_customer_id: customerId }).eq("id", subscriptionId)
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: price.stripe_price_id, quantity: 1 }],
    mode: "subscription",
    subscription_data: {
      trial_period_days: 14,
      metadata: { user_id: user.id, plan_id: planId, price_id: priceId },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/pricing`,
    metadata: { user_id: user.id, plan_id: planId, price_id: priceId },
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

  const { data: subscriptions } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .limit(1)

  const subscription = subscriptions?.[0]

  if (!subscription?.stripe_customer_id) {
    return { error: "No active subscription found" }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/billing`,
  })

  redirect(session.url)
}

export async function createUpgradeCheckoutSession(planId: string, priceId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "You must be logged in to upgrade" }
  }

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

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single()

  const { data: subscriptions } = await supabase
    .from("user_subscriptions")
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .limit(1)

  let customerId = subscriptions?.[0]?.stripe_customer_id
  const subscriptionId = subscriptions?.[0]?.id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    if (subscriptionId) {
      await supabase.from("user_subscriptions").update({ stripe_customer_id: customerId }).eq("id", subscriptionId)
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: price.stripe_price_id, quantity: 1 }],
    mode: "subscription",
    subscription_data: {
      metadata: { user_id: user.id, plan_id: planId, price_id: priceId, billing_cycle: price.billing_cycle },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/billing?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/billing`,
    metadata: { user_id: user.id, plan_id: planId, price_id: priceId, billing_cycle: price.billing_cycle },
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

  const { data: subscriptions, error: subError } = await supabase
    .from("user_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .limit(1)

  if (subError) {
    return { error: "Failed to retrieve subscription." }
  }
  const subscription = subscriptions?.[0]

  if (!subscription?.stripe_subscription_id) {
    return { error: "No active subscription found" }
  }

  try {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
      cancellation_details: { comment: feedback || "User requested cancellation", feedback: reason as any },
    })

    await supabase
      .from("user_subscriptions")
      .update({ cancel_at_period_end: true, cancellation_reason: reason })
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

  const { data: subscriptions, error: subError } = await supabase
    .from("user_subscriptions")
    .select("stripe_subscription_id, cancel_at_period_end")
    .eq("user_id", user.id)
    .limit(1)

  if (subError) {
    return { error: "Failed to retrieve subscription." }
  }
  const subscription = subscriptions?.[0]

  if (!subscription?.stripe_subscription_id) {
    return { error: "No subscription found" }
  }

  if (!subscription.cancel_at_period_end) {
    return { error: "Subscription is not scheduled for cancellation" }
  }

  try {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, { cancel_at_period_end: false })

    await supabase
      .from("user_subscriptions")
      .update({ cancel_at_period_end: false, cancellation_reason: null })
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

  const { data: subscriptions } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .limit(1)

  const customerId = subscriptions?.[0]?.stripe_customer_id

  if (!customerId) {
    return { invoices: [] }
  }

  try {
    const invoicesResponse = await stripe.invoices.list({ customer: customerId, limit: 24 })
    const invoiceItems = invoicesResponse.data.map((invoice: any) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      created: invoice.created,
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url,
      description: invoice.description || "Subscription",
    }))

    const chargesResponse = await stripe.charges.list({ customer: customerId, limit: 24 })
    const invoiceChargeIds = new Set(invoicesResponse.data.map((inv: any) => (typeof inv.charge === "string" ? inv.charge : inv.charge?.id)).filter(Boolean))
    const chargeItems = chargesResponse.data
      .filter((charge) => !invoiceChargeIds.has(charge.id) && charge.status === "succeeded")
      .map((charge) => ({
        id: charge.id,
        number: null,
        status: "paid" as const,
        amount: charge.amount / 100,
        currency: charge.currency,
        created: charge.created,
        pdfUrl: charge.receipt_url || null,
        hostedUrl: charge.receipt_url || null,
        description: charge.description || "Additional Screen Slot",
      }))

    const allItems = [...invoiceItems, ...chargeItems].sort((a, b) => b.created - a.created)

    return { success: true, invoices: allItems }
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

  const { data: subscriptions } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .limit(1)

  const customerId = subscriptions?.[0]?.stripe_customer_id

  if (!customerId) {
    return { success: true, paymentMethods: [] }
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({ customer: customerId, type: "card" })
    const customer = await stripe.customers.retrieve(customerId)

    const defaultPaymentMethodId =
      !customer.deleted && customer.invoice_settings?.default_payment_method
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

  const { data: subscriptions } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .limit(1)

  const customerId = subscriptions?.[0]?.stripe_customer_id

  if (!customerId) {
    return { error: "No customer found" }
  }

  try {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
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

  const { data: subscriptions } = await supabase
    .from("user_subscriptions")
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .limit(1)

  let customerId = subscriptions?.[0]?.stripe_customer_id
  const subscriptionId = subscriptions?.[0]?.id

  if (!customerId) {
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single()

    try {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { user_id: user.id },
      })
      customerId = customer.id

      if (subscriptionId) {
        await supabase.from("user_subscriptions").update({ stripe_customer_id: customerId }).eq("id", subscriptionId)
      } else {
        const { data: freePlan } = await supabase.from("subscription_plans").select("id").eq("name", "Free").single()

        if (freePlan) {
          await supabase.from("user_subscriptions").insert({
            user_id: user.id,
            plan_id: freePlan.id,
            stripe_customer_id: customerId,
            status: "active",
          })
        } else {
          console.error("[v0] Default 'Free' plan not found.")
          return { error: "Could not create customer record." }
        }
      }
    } catch (error: any) {
      console.error("[v0] Error creating Stripe customer:", error)
      return { error: error.message || "Failed to create customer." }
    }
  }

  if (!customerId) {
    return { error: "Could not retrieve or create customer." }
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    })

    return { success: true, clientSecret: setupIntent.client_secret }
  } catch (error: any) {
    console.error("[v0] Create setup intent error:", error)
    return { error: error.message || "Failed to create setup intent" }
  }
}
