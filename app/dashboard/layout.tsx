import type React from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { UserProvider } from "@/lib/hooks/use-user"
import { EmailVerificationBanner } from "@/components/email-verification-banner"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured()) {
    redirect("/")
  }

  // Check if user is authenticated
  const supabase = await createClient()

  // Add null check for supabase client
  if (!supabase) {
    console.error("[v0] Supabase client failed to initialize")
    redirect("/auth/login")
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    console.log("[v0] Authentication failed, redirecting to login")
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, deleted_at")
    .eq("id", user.id)
    .single()

  if (profile?.deleted_at) {
    // User is soft-deleted, sign them out and redirect
    await supabase.auth.signOut()
    redirect("/auth/login?error=account_deleted")
  }

  return (
    <UserProvider initialUser={user} initialProfile={profile}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <EmailVerificationBanner />

          {/* Header */}
          <DashboardHeader user={user} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </UserProvider>
  )
}
