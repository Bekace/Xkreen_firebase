"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Stripe from "stripe"
import bcrypt from "bcryptjs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
})

// Update the signIn function to handle redirects properly
export async function signIn(prevState: any, formData: FormData) {
  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  // Validate required fields
  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      const { data: profile } = await supabase.from("profiles").select("deleted_at").eq("id", authData.user.id).single()

      if (profile?.deleted_at) {
        // Sign out the user immediately
        await supabase.auth.signOut()
        return { error: "This account has been deleted. Please contact support if you believe this is an error." }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Update the signUp function to handle potential null formData and plan assignment
export async function signUp(prevState: { error?: string; success?: boolean; message?: string }, formData: FormData) {
  let stripeRedirectUrl: string | null = null

  try {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    const email = formData.get("email")
    const password = formData.get("password")
    const fullName = formData.get("fullName")
    const companyName = formData.get("companyName")
    const planId = formData.get("planId")
    const priceId = formData.get("priceId")
    const stripePriceId = formData.get("stripePriceId")

    if (!email || !password) {
      return { error: "Email and password are required" }
    }

    // Check if user already exists
    const { data: existingUser } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("email", email.toString())
      .single()

    if (existingUser) {
      return { error: "An account with this email already exists" }
    }

    // Check for existing pending signup and delete it
    await adminSupabase.from("pending_signups").delete().eq("email", email.toString())

    // PAID PLAN: Store in pending_signups and redirect to Stripe
    const isPaidPlan = !!stripePriceId && stripePriceId.toString().length > 0

    if (isPaidPlan) {
      // Hash password for storage
      const passwordHash = await bcrypt.hash(password.toString(), 12)

      // Create Stripe Checkout session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: email.toString(),
        line_items: [
          {
            price: stripePriceId.toString(),
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/auth/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/pricing`,
        metadata: {
          email: email.toString(),
          plan_id: planId?.toString() || "",
          price_id: priceId?.toString() || "",
        },
      })

      // Store pending signup
      const { error: pendingError } = await adminSupabase.from("pending_signups").insert({
        email: email.toString(),
        password_hash: passwordHash,
        full_name: fullName?.toString() || null,
        company_name: companyName?.toString() || null,
        plan_id: planId?.toString() || null,
        price_id: priceId?.toString() || null,
        stripe_price_id: stripePriceId.toString(),
        stripe_session_id: session.id,
      })

      if (pendingError) {
        console.error("Failed to store pending signup:", pendingError)
        return { error: "Failed to process signup. Please try again." }
      }

      if (session.url) {
        stripeRedirectUrl = session.url
      } else {
        return { error: "Failed to create checkout session" }
      }
    } else {
      // FREE PLAN: Require email verification
      const { data, error } = await supabase.auth.signUp({
        email: email.toString(),
        password: password.toString(),
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"}/auth/callback`,
          data: {
            full_name: fullName?.toString() || "",
            company_name: companyName?.toString() || "",
          },
        },
      })

      if (error) {
        return { error: error.message }
      }

      if (!data.user) {
        return { error: "Failed to create account" }
      }

      // For free plan, redirect to confirmation page
      redirect(`/auth/confirmation?email=${encodeURIComponent(email.toString())}`)
    }
  } catch (error: any) {
    // Re-throw redirect errors (Next.js uses thrown errors for redirects)
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("Signup error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }

  if (stripeRedirectUrl) {
    redirect(stripeRedirectUrl)
  }

  return { error: "An unexpected error occurred. Please try again." }
}

export async function signOut() {
  const supabase = await createClient()

  await supabase.auth.signOut()
  redirect("/auth/login")
}
