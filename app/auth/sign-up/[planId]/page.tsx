export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/sign-up-form"

interface SignUpPageProps {
  params: {
    planId: string
  }
}

export default async function SignUpWithPlanPage({ params }: SignUpPageProps) {
  const supabase = await createClient()

  // Check if user is already logged in
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  // Fetch the selected plan
  const { data: plan, error } = await supabase.from("subscription_plans").select("*").eq("id", params.planId).single()

  if (error || !plan) {
    // If plan not found, redirect to pricing page
    redirect("/auth/pricing")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <SignUpForm selectedPlan={plan} />
    </div>
  )
}
