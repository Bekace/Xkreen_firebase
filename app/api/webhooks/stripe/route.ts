import { type NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createServiceRoleClient } from "@/lib/supabase/server"
import type Stripe from "stripe"

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Webhook signature verification failed:", errorMessage)
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        let planId = session.metadata?.plan_id
        let priceId = session.metadata?.price_id
        const customerEmail = session.metadata?.email || session.customer_email

        console.log("[v0] checkout.session.completed")
        console.log("[v0] session metadata - planId:", planId, "priceId:", priceId, "email:", customerEmail)
        console.log(
          "[v0] session.id:",
          session.id,
          "subscription:",
          session.subscription,
          "customer:",
          session.customer,
        )

        if (session.subscription) {
          console.log("[v0] Fetching subscription metadata from Stripe")
          const subscription = await stripe.subscriptions.retrieve(session.subscription.toString())
          planId = subscription.metadata?.plan_id || planId
          priceId = subscription.metadata?.price_id || priceId
          console.log("[v0] subscription metadata - planId:", planId, "priceId:", priceId)
        }

        // Look up pending signup by stripe_session_id
        const { data: pendingSignup, error: pendingError } = await supabase
          .from("pending_signups")
          .select("*")
          .eq("stripe_session_id", session.id)
          .single()

        console.log("[v0] pendingSignup found:", !!pendingSignup)
        if (pendingError) console.log("[v0] pendingError:", pendingError.message)

        let userId: string | null = null

        if (pendingSignup) {
          console.log("[v0] Creating user for:", pendingSignup.email)

          // Create user in Supabase Auth with admin API
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: pendingSignup.email,
            email_confirm: true,
            user_metadata: {
              full_name: pendingSignup.full_name || "",
              company_name: pendingSignup.company_name || "",
            },
          })

          if (authError) {
            console.error("[v0] Failed to create user:", authError)
            return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
          }

          userId = authData.user.id
          console.log("[v0] User created with id:", userId)

          // Update password hash directly in auth.users
          const { error: passwordError } = await supabase.rpc("set_user_password_hash", {
            user_id: userId,
            password_hash: pendingSignup.password_hash,
          })

          if (passwordError) {
            console.error("[v0] Failed to set password:", passwordError)
          }

          // Update profile with Stripe customer ID
          await supabase.from("profiles").update({ stripe_customer_id: session.customer?.toString() }).eq("id", userId)

          // Delete pending signup record
          await supabase.from("pending_signups").delete().eq("id", pendingSignup.id)
          console.log("[v0] Deleted pending signup record")
        } else {
          console.log("[v0] No pending signup found, looking up existing user by customer:", session.customer)

          if (session.customer) {
            const { data: existingSubscription } = await supabase
              .from("user_subscriptions")
              .select("user_id")
              .eq("stripe_customer_id", session.customer.toString())
              .single()

            if (existingSubscription) {
              userId = existingSubscription.user_id
              console.log("[v0] Found existing user by customer ID from subscriptions:", userId)
            } else {
              // Try profiles table as fallback
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("stripe_customer_id", session.customer.toString())
                .single()

              if (profile) {
                userId = profile.id
                console.log("[v0] Found existing user by customer ID from profiles:", userId)
              }
            }
          }

          // If not found by customer ID, try by email
          if (!userId && customerEmail) {
            console.log("[v0] Looking up user by email:", customerEmail)

            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", customerEmail)
              .single()

            if (profile) {
              userId = profile.id
              console.log("[v0] Found user by email:", userId)

              if (session.customer) {
                const { error: updateError } = await supabase
                  .from("profiles")
                  .update({ stripe_customer_id: session.customer.toString() })
                  .eq("id", userId)

                if (updateError) {
                  console.error("[v0] Failed to update profile with customer ID:", updateError)
                } else {
                  console.log("[v0] Updated profile with stripe_customer_id:", session.customer.toString())
                }
              }
            } else {
              console.error("[v0] No user found for email:", customerEmail, "Error:", profileError)
            }
          }

          if (!userId && session.customer) {
            console.log("[v0] Attempting to fetch customer from Stripe:", session.customer)
            try {
              const customer = await stripe.customers.retrieve(session.customer.toString())
              if (!customer.deleted && customer.email) {
                console.log("[v0] Found customer email from Stripe:", customer.email)

                const { data: profile } = await supabase
                  .from("profiles")
                  .select("id")
                  .eq("email", customer.email)
                  .single()

                if (profile) {
                  userId = profile.id
                  console.log("[v0] Found user by Stripe customer email:", userId)

                  // Update profile with customer ID
                  await supabase
                    .from("profiles")
                    .update({ stripe_customer_id: session.customer.toString() })
                    .eq("id", userId)
                }
              }
            } catch (error) {
              console.error("[v0] Failed to retrieve Stripe customer:", error)
            }
          }
        }

        console.log(
          "[v0] Before subscription - userId:",
          userId,
          "planId:",
          planId,
          "priceId:",
          priceId,
          "subscription:",
          session.subscription,
        )

        if (userId && planId && priceId && session.subscription) {
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id, stripe_subscription_id")
            .eq("user_id", userId)
            .single()

          if (existingSub) {
            console.log("[v0] Existing subscription found, updating for upgrade")
            console.log("[v0] Old stripe_subscription_id:", existingSub.stripe_subscription_id)
            console.log("[v0] New stripe_subscription_id:", session.subscription.toString())
            console.log("[v0] Updating to plan_id:", planId, "price_id:", priceId)

            // Get trial info from price if available
            const { data: priceData } = await supabase
              .from("subscription_prices")
              .select("trial_days")
              .eq("id", priceId)
              .single()

            const trialDays = priceData?.trial_days || 0
            const now = new Date()
            const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null

            const updateData = {
              plan_id: planId,
              price_id: priceId,
              stripe_subscription_id: session.subscription.toString(),
              stripe_customer_id: session.customer?.toString(),
              status: trialDays > 0 ? "trialing" : "active",
              trial_ends_at: trialEnd?.toISOString() || null,
              started_at: now.toISOString(),
              expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: now.toISOString(),
            }

            console.log("[v0] Update data:", JSON.stringify(updateData, null, 2))

            const { data: updatedSub, error: updateError } = await supabase
              .from("user_subscriptions")
              .update(updateData)
              .eq("id", existingSub.id)
              .select()
              .single()

            if (updateError) {
              console.error("[v0] Failed to update subscription:", updateError)
            } else {
              console.log(
                "[v0] Successfully updated subscription for user:",
                userId,
                "New subscription data:",
                JSON.stringify(updatedSub, null, 2),
              )
            }
          } else {
            console.log("[v0] No existing subscription, creating new one")

            // Get trial info from price
            const { data: priceData } = await supabase
              .from("subscription_prices")
              .select("trial_days")
              .eq("id", priceId)
              .single()

            const trialDays = priceData?.trial_days || 0
            const now = new Date()
            const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null

            console.log("[v0] Inserting subscription with userId:", userId, "planId:", planId, "priceId:", priceId)

            const { error: subError } = await supabase.from("user_subscriptions").insert({
              user_id: userId,
              plan_id: planId,
              price_id: priceId,
              stripe_subscription_id: session.subscription.toString(),
              stripe_customer_id: session.customer?.toString(),
              status: trialDays > 0 ? "trialing" : "active",
              trial_ends_at: trialEnd?.toISOString() || null,
              started_at: now.toISOString(),
              expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })

            if (subError) {
              console.error("[v0] Failed to create subscription:", subError)
            } else {
              console.log("[v0] Created subscription for user:", userId)
            }
          }
        } else {
          console.error(
            "[v0] Missing data for subscription - userId:",
            userId,
            "planId:",
            planId,
            "priceId:",
            priceId,
            "subscription:",
            session.subscription,
          )
        }

        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            status: subscription.status,
            expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            // Track when subscription was canceled if applicable
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", subscription.id)

        if (error) {
          console.error("[v0] Failed to update subscription:", error)
        } else {
          console.log("[v0] Updated subscription status and cancellation tracking for:", subscription.id)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            status: "canceled",
          })
          .eq("stripe_subscription_id", subscription.id)

        if (error) {
          console.error("[v0] Failed to cancel subscription:", error)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "active",
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", invoice.subscription.toString())
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from("user_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription.toString())
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
