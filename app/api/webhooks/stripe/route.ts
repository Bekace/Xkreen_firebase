import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

// Initialize Supabase with service role for webhook processing
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log("[v0] Webhook event received:", event.type)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const planId = session.metadata?.plan_id
        const priceId = session.metadata?.price_id

        if (userId && planId && session.subscription) {
          // Retrieve the subscription to get trial info
          const subscription = await stripe.subscriptions.retrieve(session.subscription.toString())

          const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null

          // Update subscription with Stripe details
          const { error: updateError } = await supabase
            .from("user_subscriptions")
            .update({
              stripe_subscription_id: session.subscription.toString(),
              stripe_customer_id: session.customer?.toString(),
              status: trialEnd ? "trialing" : "active",
              trial_ends_at: trialEnd,
              started_at: new Date().toISOString(),
              expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("user_id", userId)
            .eq("plan_id", planId)

          if (updateError) {
            console.error("[v0] Error updating subscription:", updateError)
          } else {
            console.log("[v0] Subscription activated for user:", userId)
          }
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        const status =
          subscription.status === "trialing"
            ? "trialing"
            : subscription.status === "active"
              ? "active"
              : subscription.status === "past_due"
                ? "past_due"
                : subscription.status === "canceled"
                  ? "canceled"
                  : subscription.status

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            status,
            started_at: new Date(subscription.current_period_start * 1000).toISOString(),
            expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", subscription.id)

        if (error) {
          console.error("[v0] Error updating subscription:", error)
        } else {
          console.log("[v0] Subscription updated:", subscription.id, status)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            status: "canceled",
            expires_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)

        if (error) {
          console.error("[v0] Error canceling subscription:", error)
        } else {
          console.log("[v0] Subscription canceled:", subscription.id)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          const { error } = await supabase
            .from("user_subscriptions")
            .update({
              status: "active",
              payment_method: "card",
            })
            .eq("stripe_subscription_id", invoice.subscription.toString())

          if (error) {
            console.error("[v0] Error updating payment status:", error)
          } else {
            console.log("[v0] Payment succeeded for subscription:", invoice.subscription)
          }
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          const { error } = await supabase
            .from("user_subscriptions")
            .update({
              status: "past_due",
            })
            .eq("stripe_subscription_id", invoice.subscription.toString())

          if (error) {
            console.error("[v0] Error updating payment status:", error)
          } else {
            console.log("[v0] Payment failed for subscription:", invoice.subscription)
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
