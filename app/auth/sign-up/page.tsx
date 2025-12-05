export const dynamic = "force-dynamic"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/sign-up-form"

export default async function SignUpPage() {
  // If Supabase is not configured, show setup message directly
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Connect Supabase to get started</h1>
      </div>
    )
  }

  try {
    // Check if user is already logged in
    const supabase = await createClient()

    if (!supabase) {
      // If client creation fails, show the sign-up form anyway
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
          <SignUpForm />
        </div>
      )
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If user is logged in, redirect to dashboard
    if (session) {
      redirect("/dashboard")
    }
  } catch (error) {
    console.error("Auth check failed:", error)
    // Continue to show sign-up form if auth check fails
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <SignUpForm />
    </div>
  )
}
