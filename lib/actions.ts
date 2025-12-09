"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { stripe } from "@/lib/stripe"

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

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

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")
  const companyName = formData.get("companyName")
  const planId = formData.get("planId")
  const priceId = formData.get("priceId")
  const stripePriceId = formData.get("stripePriceId")
  const billingCycle = formData.get("billingCycle")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = await createClient()

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-pointer-ai-landing-page-psi-six-73.vercel.app"}/dashboard`,
        data: {
          full_name: fullName?.toString() || "",
          company_name: companyName?.toString() || "",
        },
      },
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: "Failed to create user" }
    }

    const userId = authData.user.id

    if (companyName) {
      await supabase.from("profiles").update({ company_name: companyName.toString() }).eq("id", userId)
    }

    let selectedPlanId = planId?.toString()
    let selectedPriceId = priceId?.toString()

    if (!selectedPlanId) {
      const { data: freePlan } = await supabase.from("subscription_plans").select("id").eq("name", "Free").single()

      if (freePlan) {
        selectedPlanId = freePlan.id

        const { data: freePrice } = await supabase
          .from("subscription_prices")
          .select("id")
          .eq("plan_id", freePlan.id)
          .eq("billing_cycle", "monthly")
          .single()

        if (freePrice) {
          selectedPriceId = freePrice.id
        }
      }
    }

    const isPaidPlan = stripePriceId && stripePriceId.toString().startsWith("price_")

    if (isPaidPlan && selectedPlanId && selectedPriceId) {
      try {
        const customer = await stripe.customers.create({
          email: email.toString(),
          name: fullName?.toString() || undefined,
          metadata: {
            user_id: userId,
            plan_id: selectedPlanId,
          },
        })

        const { data: priceData } = await supabase
          .from("subscription_prices")
          .select("trial_days")
          .eq("id", selectedPriceId)
          .single()

        const trialDays = priceData?.trial_days || 0

        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price: stripePriceId.toString(),
              quantity: 1,
            },
          ],
          subscription_data: {
            trial_period_days: trialDays > 0 ? trialDays : undefined,
            metadata: {
              user_id: userId,
              plan_id: selectedPlanId,
              price_id: selectedPriceId,
            },
          },
          success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-pointer-ai-landing-page-psi-six-73.vercel.app"}/auth/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://v0-pointer-ai-landing-page-psi-six-73.vercel.app"}/auth/pricing`,
          metadata: {
            user_id: userId,
            plan_id: selectedPlanId,
            price_id: selectedPriceId,
          },
        })

        await supabase.from("user_subscriptions").insert({
          user_id: userId,
          plan_id: selectedPlanId,
          price_id: selectedPriceId,
          status: "pending",
          stripe_customer_id: customer.id,
          started_at: new Date().toISOString(),
        })

        if (session.url) {
          redirect(session.url)
        }
      } catch (stripeError) {
        console.error("[v0] Stripe error:", stripeError)
        return { error: "Failed to create payment session. Please try again." }
      }
    } else {
      if (selectedPlanId && selectedPriceId) {
        await supabase.from("user_subscriptions").insert({
          user_id: userId,
          plan_id: selectedPlanId,
          price_id: selectedPriceId,
          status: "active",
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }

      return { success: "Check your email to confirm your account." }
    }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const supabase = await createClient()

  await supabase.auth.signOut()
  redirect("/auth/login")
}
