import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

/**
 * POST /api/stripe/confirm-screen-purchase
 * Called when the user returns from Stripe Checkout with ?session_id=xxx
 * Verifies the payment succeeded directly with Stripe and credits the slot in DB.
 * This is more reliable than waiting for a webhook in a sandbox environment.
 */
export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Verify the Stripe Checkout Session directly
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Confirm this session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 })
    }

    if (session.metadata?.type !== "screen_slot") {
      return NextResponse.json({ error: "Not a screen slot purchase" }, { status: 400 })
    }

    const subscriptionId = session.metadata?.subscription_id
    if (!subscriptionId) {
      return NextResponse.json({ error: "Missing subscription ID in session metadata" }, { status: 400 })
    }

    // Use service role to increment purchased_screen_slots
    const serviceSupabase = createServiceRoleClient()

    // Check if this session was already processed (idempotency)
    const { data: existingRecord } = await serviceSupabase
      .from("user_subscriptions")
      .select("id, purchased_screen_slots, last_credited_session_id")
      .eq("id", subscriptionId)
      .single()

    if (existingRecord?.last_credited_session_id === sessionId) {
      // Already processed — just return success
      return NextResponse.json({ success: true, alreadyProcessed: true })
    }

    // Increment purchased_screen_slots and record the session ID to prevent double-credit
    const { error: updateError } = await serviceSupabase
      .from("user_subscriptions")
      .update({
        purchased_screen_slots: (existingRecord?.purchased_screen_slots ?? 0) + 1,
        last_credited_session_id: sessionId,
      })
      .eq("id", subscriptionId)

    if (updateError) {
      console.error("[confirm-screen-purchase] Failed to credit slot:", updateError)
      return NextResponse.json({ error: "Failed to credit screen slot" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[confirm-screen-purchase] error:", err)
    return NextResponse.json({ error: err.message || "Failed to confirm purchase" }, { status: 500 })
  }
}
