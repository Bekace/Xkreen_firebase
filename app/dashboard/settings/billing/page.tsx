import { Button } from "@/components/ui/button"
export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreditCard, Package, Receipt } from "lucide-react"
import BillingClient from "./billing-client"

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

  let subscription = null
  let plan = null
  let allPlans = []

  try {
    const { data: subData } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        subscription_plans (
          *,
          subscription_prices (*)
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    subscription = subData
    plan = subscription?.subscription_plans

    if (!subscription || !plan) {
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select(`
          *,
          subscription_prices (*)
        `)
        .eq("name", "Free")
        .eq("is_active", true)
        .single()

      if (freePlan) {
        plan = freePlan
      }
    }

    const { data: plans } = await supabase
      .from("subscription_plans")
      .select(`
        *,
        subscription_prices (
          id,
          plan_id,
          billing_cycle,
          price,
          stripe_price_id,
          trial_days,
          is_active
        )
      `)
      .eq("is_active", true)
      .order("name", { ascending: true })

    // Map the subscription_prices array to prices array expected by the component
    allPlans =
      plans?.map((plan) => ({
        ...plan,
        prices: plan.subscription_prices || [],
      })) || []
  } catch (err) {
    console.error("[v0] Billing page error:", err)
  }

  const userBillingCycle = subscription?.billing_cycle || "monthly"
  const currentPrice = plan?.subscription_prices?.find((p: any) => p.billing_cycle === userBillingCycle && p.is_active)
  const displayPrice = currentPrice?.price ? Number(currentPrice.price).toFixed(0) : "0"
  const billingCycle = userBillingCycle === "yearly" ? "year" : "month"

  const storageGB = plan?.max_media_storage ? Math.round(plan.max_media_storage / 1024 / 1024 / 1024) : 0

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
                <span className="font-medium">{plan?.name || "Free"} Plan</span>
                <span className="text-primary font-semibold">
                  ${displayPrice}/{billingCycle}
                </span>
              </div>
              {plan && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Max Screens: {plan.max_screens === -1 ? "Unlimited" : plan.max_screens || 0}</p>
                  <p>
                    Max Playlists:{" "}
                    {plan.max_playlists === 999999 || plan.max_playlists === -1 ? "Unlimited" : plan.max_playlists || 0}
                  </p>
                  <p>Storage: {storageGB} GB</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            {subscription?.status === "active" || subscription?.status === "trialing"
              ? "Active subscription"
              : "No active subscription"}
          </p>
          <BillingClient plans={allPlans} currentPlanId={plan?.id} />
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
