import { type NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createServiceRoleClient } from "@/lib/supabase/server"
import type Stripe from "stripe"

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // Screen slot purchases are handled exclusively by /api/stripe/confirm-screen-purchase
        // which runs client-side after redirect and uses last_credited_session_id for idempotency.
        // Incrementing here too would cause double-counting.
        if (session.metadata?.type === "screen_slot") {
          break
        }

        let planId = session.metadata?.plan_id
        let priceId = session.metadata?.price_id
        const customerEmail = session.metadata?.email || session.customer_email

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription.toString())
          planId = subscription.metadata?.plan_id || planId
          priceId = subscription.metadata?.price_id || priceId
        }

        // Look up pending signup by stripe_session_id
        const { data: pendingSignup, error: pendingError } = await supabase
          .from("pending_signups")
          .select("*")
          .eq("stripe_session_id", session.id)
          .single()

        let userId: string | null = null

        if (pendingSignup) {
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
            console.error("Failed to create user:", authError)
            return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
          }

          userId = authData.user.id

          const { error: passwordError } = await supabase.rpc("set_user_password_hash", {
            user_id: userId,
            password_hash: pendingSignup.password_hash,
          })

          if (passwordError) {
            console.error("Failed to set password:", passwordError)
          }

          await supabase.from("profiles").update({ stripe_customer_id: session.customer?.toString() }).eq("id", userId)
          await supabase.from("pending_signups").delete().eq("id", pendingSignup.id)
        } else {
          if (session.customer) {
            const { data: existingSubscription } = await supabase
              .from("user_subscriptions")
              .select("user_id")
              .eq("stripe_customer_id", session.customer.toString())
              .single()

            if (existingSubscription) {
              userId = existingSubscription.user_id
            } else {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("stripe_customer_id", session.customer.toString())
                .single()

              if (profile) {
                userId = profile.id
              }
            }
          }

          if (!userId && customerEmail) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", customerEmail)
              .single()

            if (profile) {
              userId = profile.id

              if (session.customer) {
                await supabase
                  .from("profiles")
                  .update({ stripe_customer_id: session.customer.toString() })
                  .eq("id", userId)
              }
            }
          }

          if (!userId && session.customer) {
            try {
              const customer = await stripe.customers.retrieve(session.customer.toString())
              if (!customer.deleted && customer.email) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("id")
                  .eq("email", customer.email)
                  .single()

                if (profile) {
                  userId = profile.id
                  await supabase
                    .from("profiles")
                    .update({ stripe_customer_id: session.customer.toString() })
                    .eq("id", userId)
                }
              }
            } catch (error) {
              console.error("Failed to retrieve Stripe customer:", error)
            }
          }
        }

        if (userId && planId && priceId && session.subscription) {
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id, stripe_subscription_id")
            .eq("user_id", userId)
            .single()

          if (existingSub) {

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
              console.error("[v0] ❌ Failed to update subscription:", updateError)
              return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
            }

            // The upgrade payment = purchasing 1 screen slot.
            // Increment purchased_screen_slots by 1 so the user can create a new screen immediately.
            const { error: slotError } = await supabase.rpc("increment_purchased_screen_slots", {
              p_subscription_id: existingSub.id,
            })
            if (slotError) {
              console.error("[v0] Failed to grant screen slot on upgrade:", slotError)
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
              console.error("Failed to create subscription:", subError)
            }
          }
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
          console.error("Failed to update subscription:", error)
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
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
