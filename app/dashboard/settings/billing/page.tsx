export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreditCard, Package, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function BillingSettingsPage() {
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

  // Fetch user subscription
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select(`
      *,
      subscription_plans (*)
    `)
    .eq("user_id", user.id)
    .single()

  const plan = subscription?.subscription_plans

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Current Plan</h2>
            <p className="text-sm text-muted-foreground mb-4">Your current subscription plan and usage limits.</p>
            <div className="bg-muted/30 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{plan?.name || "Free Plan"}</span>
                <span className="text-primary font-semibold">
                  ${plan?.price || 0}/{plan?.billing_cycle || "month"}
                </span>
              </div>
              {plan && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Max Screens: {plan.max_screens}</p>
                  <p>Max Playlists: {plan.max_playlists}</p>
                  <p>
                    Storage: {plan.max_media_storage} {plan.storage_unit}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            {subscription?.status === "active" ? "Active subscription" : "No active subscription"}
          </p>
          <Button size="sm" variant="outline">
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* Payment Method */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Payment Method</h2>
            <p className="text-sm text-muted-foreground mb-4">Manage your payment methods and billing information.</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <Button size="sm" disabled>
            Add Payment Method
          </Button>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Receipt className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Invoices</h2>
            <p className="text-sm text-muted-foreground mb-4">View and download your past invoices.</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <Button size="sm" variant="outline" disabled>
            View Invoices
          </Button>
        </div>
      </div>
    </div>
  )
}
