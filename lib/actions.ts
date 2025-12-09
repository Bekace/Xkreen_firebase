"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

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

    // Return success instead of redirecting directly
    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Update the signUp function to handle potential null formData and plan assignment
export async function signUp(prevState: any, formData: FormData) {
  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")
  const companyName = formData.get("companyName")
  const planId = formData.get("planId")

  // Validate required fields
  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = await createClient()

  try {
    // Create auth user
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

    // If planId is provided, create subscription record
    // Otherwise, assign Free plan by default
    if (authData.user) {
      const userId = authData.user.id

      // Determine which plan to assign
      let selectedPlanId = planId?.toString()

      // If no plan selected, get the Free plan
      if (!selectedPlanId) {
        const { data: freePlan, error: freePlanError } = await supabase
          .from("subscription_plans")
          .select("id")
          .eq("name", "Free")
          .single()

        if (freePlanError) {
          console.error("[v0] Error fetching Free plan:", freePlanError)
        } else {
          selectedPlanId = freePlan?.id
        }
      }

      // Create subscription record
      if (selectedPlanId) {
        const { error: subscriptionError } = await supabase.from("user_subscriptions").insert({
          user_id: userId,
          plan_id: selectedPlanId,
          status: "active",
          started_at: new Date().toISOString(),
        })

        if (subscriptionError) {
          console.error("[v0] Error creating subscription:", subscriptionError)
        }
      }

      // Update profile with company name if provided
      if (companyName) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ company_name: companyName.toString() })
          .eq("id", userId)

        if (profileError) {
          console.error("[v0] Error updating profile:", profileError)
        }
      }
    }

    return { success: "Check your email to confirm your account." }
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
