import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const params = await searchParams
  const showWelcome = params.welcome === "true"

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Connect Supabase to get started</h1>
      </div>
    )
  }

  try {
    const supabase = await createClient()

    if (!supabase) {
      console.error("[v0] Supabase client failed to initialize")
      redirect("/auth/login")
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // If no user, redirect to login
    if (!user) {
      redirect("/auth/login")
    }

    return <DashboardOverview user={user} showWelcome={showWelcome} />
  } catch (error) {
    console.error("[v0] Dashboard auth error:", error)
    redirect("/auth/login")
  }
}
