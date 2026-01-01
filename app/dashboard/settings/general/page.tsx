export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Crown, Check } from "lucide-react"
import Link from "next/link"

export default async function GeneralSettingsPage() {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/auth/login")
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch profile data
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select(`
      *,
      subscription_plans (*)
    `)
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single()

  let plan = subscription?.subscription_plans

  // If no active subscription, default to Free plan
  if (!subscription || !plan) {
    const { data: freePlan } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("name", "Free")
      .eq("is_active", true)
      .single()

    if (freePlan) {
      plan = freePlan
    }
  }

  // Get all plans to determine if current plan is highest
  const { data: allPlans } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true })

  const isHighestPlan = allPlans && plan && allPlans[allPlans.length - 1]?.id === plan.id

  // Parse features from JSON
  const features = plan?.features ? (Array.isArray(plan.features) ? plan.features : []) : []

  return (
    <div className="space-y-6">
      {plan && (
        <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{plan.name} Plan</h2>
                <p className="text-sm text-muted-foreground">
                  {subscription?.status === "active" || subscription?.status === "trialing"
                    ? "Active subscription"
                    : "Current plan"}
                </p>
              </div>
            </div>
            {!isHighestPlan && (
              <Link href="/dashboard/settings/billing">
                <Button size="sm" className="gap-2">
                  <Crown className="w-4 h-4" />
                  Upgrade Plan
                </Button>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-background/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">Screens</p>
              <p className="text-lg font-semibold">{plan.max_screens === -1 ? "Unlimited" : plan.max_screens}</p>
            </div>
            <div className="bg-background/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">Playlists</p>
              <p className="text-lg font-semibold">{plan.max_playlists === -1 ? "Unlimited" : plan.max_playlists}</p>
            </div>
            <div className="bg-background/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">Storage</p>
              <p className="text-lg font-semibold">
                {plan.max_media_storage === -1 ? "Unlimited" : `${Math.round(plan.max_media_storage / 1073741824)} GB`}
              </p>
            </div>
          </div>

          {features.length > 0 && (
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm font-medium mb-3">Plan Features:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Email</h2>
        <p className="text-sm text-muted-foreground mb-4">Your email address is used for login and notifications.</p>
        <div className="bg-muted/30 rounded-md px-4 py-3">
          <p className="text-sm font-mono">{user.email}</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">Contact support to change your email address.</p>
      </div>

      {/* User ID Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">User ID</h2>
        <p className="text-sm text-muted-foreground mb-4">Your unique identifier in our system.</p>
        <div className="bg-muted/30 rounded-md px-4 py-3">
          <p className="text-sm font-mono">{user.id}</p>
        </div>
      </div>

      {/* Account Created Section */}
      <div className="rounded-lg border border-border/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Account Created</h2>
        <p className="text-sm text-muted-foreground mb-4">The date when your account was created.</p>
        <div className="bg-muted/30 rounded-md px-4 py-3">
          <p className="text-sm">
            {new Date(user.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Role Section */}
      {profile?.role && (
        <div className="rounded-lg border border-border/50 p-6">
          <h2 className="text-lg font-semibold mb-2">Role</h2>
          <p className="text-sm text-muted-foreground mb-4">Your current role and permissions level.</p>
          <div className="bg-muted/30 rounded-md px-4 py-3">
            <p className="text-sm capitalize">{profile.role}</p>
          </div>
        </div>
      )}
    </div>
  )
}
