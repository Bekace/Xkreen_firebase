export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/sign-up-form"

interface SignUpPageProps {
  params: {
    planId: string
  }
  searchParams: {
    billing?: string
    priceId?: string
  }
}

export default async function SignUpWithPlanPage({ params, searchParams }: SignUpPageProps) {
  const supabase = await createClient()

  // Check if user is already logged in
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  const billingCycle = searchParams.billing || "monthly"
  const priceId = searchParams.priceId

  // Fetch the selected plan with prices
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", params.planId)
    .single()

  if (planError || !plan) {
    redirect("/auth/pricing")
  }

  // Fetch the specific price for this plan and billing cycle
  let priceQuery = supabase.from("subscription_prices").select("*").eq("plan_id", params.planId).eq("is_active", true)

  if (priceId) {
    priceQuery = priceQuery.eq("id", priceId)
  } else {
    priceQuery = priceQuery.eq("billing_cycle", billingCycle)
  }

  const { data: price, error: priceError } = await priceQuery.single()

  if (priceError || !price) {
    // Fallback to any active price for this plan
    const { data: fallbackPrice } = await supabase
      .from("subscription_prices")
      .select("*")
      .eq("plan_id", params.planId)
      .eq("is_active", true)
      .limit(1)
      .single()

    if (!fallbackPrice) {
      redirect("/auth/pricing")
    }
  }

  // Extract display features
  const displayFeatures = plan.features?.display_features || []

  const selectedPlan = {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: price?.price || 0,
    priceId: price?.id || null,
    stripePriceId: price?.stripe_price_id || null,
    billingCycle: price?.billing_cycle || billingCycle,
    trialDays: price?.trial_days || 0,
    features: displayFeatures,
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <SignUpForm selectedPlan={selectedPlan} />
    </div>
  )
}
