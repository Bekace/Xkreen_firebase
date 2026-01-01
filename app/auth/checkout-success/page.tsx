import { redirect } from "next/navigation"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
})

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  const sessionId = params.session_id

  if (!sessionId) {
    redirect("/auth/pricing")
  }

  // Get the Stripe checkout session to find the user
  let stripeSession
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (error) {
    console.error("Failed to retrieve Stripe session:", error)
    redirect("/auth/pricing?error=invalid_session")
  }

  const email = stripeSession.metadata?.email || stripeSession.customer_email

  if (!email) {
    console.error("No email in Stripe session metadata")
    redirect("/auth/login?error=no_user")
  }

  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // Check if user already has a session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const { data: profile } = await adminSupabase.from("profiles").select("id, email").eq("email", email).single()

    if (!profile) {
      // User not created yet - redirect to login with success message
      // The webhook should create the user shortly
      redirect(`/auth/login?checkout=success&email=${encodeURIComponent(email)}`)
    }

    // User exists - redirect to login with success message
    redirect(`/auth/login?checkout=success&email=${encodeURIComponent(profile.email || email)}`)
  }

  // User is signed in, redirect to dashboard with welcome
  redirect("/dashboard?welcome=true")
}
