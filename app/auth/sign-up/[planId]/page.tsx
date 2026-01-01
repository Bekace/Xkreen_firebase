export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/sign-up-form"

interface SignUpPageProps {
  params: Promise<{
    planId: string
  }>
  searchParams: Promise<{
    billing?: string
    priceId?: string
  }>
}

function getDisplayFeatures(features: Record<string, unknown> | null): string[] {
  if (!features) return []

  const displayFeatures: string[] = []

  if (features.max_screens !== undefined) {
    const screens = features.max_screens as number
    displayFeatures.push(screens === -1 ? "Unlimited screens" : `Up to ${screens} screens`)
  }
  if (features.max_playlists !== undefined) {
    const playlists = features.max_playlists as number
    displayFeatures.push(playlists === -1 ? "Unlimited playlists" : `${playlists} playlists`)
  }
  if (features.max_media_storage_mb !== undefined) {
    const storageMB = features.max_media_storage_mb as number
    if (storageMB === -1) {
      displayFeatures.push("Unlimited storage")
    } else if (storageMB >= 1024) {
      displayFeatures.push(`${Math.round(storageMB / 1024)}GB storage`)
    } else {
      displayFeatures.push(`${storageMB}MB storage`)
    }
  }

  return displayFeatures
}

export default async function SignUpWithPlanPage({ params, searchParams }: SignUpPageProps) {
  const { planId } = await params
  const { billing = "monthly", priceId } = await searchParams

  const supabase = await createClient()

  // Check if user is already logged in
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  const { data: plan, error } = await supabase.from("subscription_plans").select("*").eq("id", planId).single()

  if (error || !plan) {
    redirect("/auth/pricing")
  }

  const { data: prices } = await supabase
    .from("subscription_prices")
    .select("*")
    .eq("plan_id", planId)
    .eq("is_active", true)

  // Find the selected price based on billing cycle or priceId
  const selectedPrice = prices?.find((p) => (priceId ? p.id === priceId : p.billing_cycle === billing)) || prices?.[0]

  // Convert features JSON to display array
  const displayFeatures = getDisplayFeatures(plan.features as Record<string, unknown>)

  // Create the plan object with display-friendly format
  const planWithPrice = {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: selectedPrice?.price || 0,
    billing_cycle: selectedPrice?.billing_cycle || billing,
    features: displayFeatures,
    priceId: selectedPrice?.id,
    stripePriceId: selectedPrice?.stripe_price_id,
    trialDays: selectedPrice?.trial_days || 0,
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <SignUpForm selectedPlan={planWithPrice} />
    </div>
  )
}
