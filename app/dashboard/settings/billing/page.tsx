export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreditCard, Package, Receipt } from "lucide-react"
import BillingClient from "./billing-client"
import { PaymentMethodsManager } from "@/components/payment-methods-manager"
import { InvoicesList } from "@/components/invoices-list"

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
  let currentPrice = null
  let currentScreenCount = 0

  try {
    // Fetch screen count first, as it's always needed
    const { count, error: screenCountError } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (screenCountError) throw screenCountError
    currentScreenCount = count || 0

    const { data: subData, error: subError } = await supabase
      .from("user_subscriptions")
      .select(
        `
        *,
        subscription_plans (
          *
        ),
        subscription_prices (
          *
        )
      `,
      )
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    subscription = subData
    plan = subscription?.subscription_plans
    currentPrice = subscription?.subscription_prices

    if (!subscription || !plan) {
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select(
          `
          *,
          subscription_prices (*)
        `,
        )
        .eq("name", "Free")
        .eq("is_active", true)
        .single()

      if (freePlan) {
        plan = freePlan
      }
    }

    const { data: plans } = await supabase
      .from("subscription_plans")
      .select(
        `
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
      `,
      )
      .eq("is_active", true)
      .order("name", { ascending: true })

    allPlans =
      plans?.map((p) => ({
        ...p,
        prices: p.subscription_prices || [],
      })) || []
  } catch (err) {
    console.error("Billing page data fetching error:", err)
    // Allow rendering with partial data if possible
  }

  const hasActiveSubscription = !!(
    subscription?.stripe_subscription_id &&
    (subscription?.status === "active" || subscription?.status === "trialing")
  )

  const userBillingCycle = currentPrice?.billing_cycle || "monthly"
  const pricePerScreen = currentPrice?.price ? Number(currentPrice.price) : 0
  const billingCycle = userBillingCycle === "yearly" ? "year" : "month"

  const freeScreens = (plan as any)?.free_screens ?? 0
  const billableScreens = Math.max(0, currentScreenCount - freeScreens)
  const totalCost = billableScreens * pricePerScreen
  const isPaidPerScreen = hasActiveSubscription && plan?.name !== "Free" && pricePerScreen > 0

  const storageGB = plan?.max_media_storage ? Math.round(plan.max_media_storage / 1024 / 1024 / 1024) : 0

  const getSubscriptionStatus = () => {
    if (!subscription || !hasActiveSubscription) {
      return "No active subscription"
    }

    if (subscription.cancel_at_period_end) {
      const expiresAt = subscription.expires_at
        ? new Date(subscription.expires_at).toLocaleDateString()
        : "end of period"
      return `Cancels on ${expiresAt}`
    }

    if (subscription.status === "trialing") {
      const trialEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString() : "soon"
      return `Trial ends ${trialEnd}`
    }

    return "Active subscription"
  }

  const formattedExpiresAt = subscription?.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : undefined

  const nextPaymentDate = subscription?.started_at
    ? new Date(new Date(subscription.started_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : undefined

  return (
    <div className="space-y-6">
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
                <div>
                  <div className="font-medium">{plan?.name || "Free"} Plan</div>
                  {isPaidPerScreen ? (
                    <div className="text-sm text-muted-foreground mt-1">
                      ${pricePerScreen.toFixed(2)}/screen/{billingCycle}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mt-1">Free</div>
                  )}
                  {hasActiveSubscription && (
                    <div className="text-xs text-muted-foreground mt-1">(VAT or sales tax may apply)</div>
                  )}
                </div>
              </div>
              {isPaidPerScreen && (
                <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total screens:</span>
                      <span className="font-medium">{currentScreenCount}</span>
                    </div>
                    {freeScreens > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Free screens:</span>
                        <span className="font-medium text-emerald-600">−{freeScreens}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billable screens:</span>
                      <span className="font-medium">{billableScreens}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/20">
                      <span className="font-medium">Total / {billingCycle}:</span>
                      <span className="font-semibold">${totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium pt-1">Billed {userBillingCycle === "yearly" ? "annually" : "monthly"}</p>
                  {nextPaymentDate && (
                    <p className="text-sm text-muted-foreground">Next payment: {nextPaymentDate}</p>
                  )}
                </div>
              )}
              {hasActiveSubscription && !isPaidPerScreen && (
                <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                  <p className="text-sm font-medium">Billed {userBillingCycle === "yearly" ? "annually" : "monthly"}</p>
                  {nextPaymentDate && (
                    <p className="text-sm text-muted-foreground">Next payment: {nextPaymentDate}</p>
                  )}
                </div>
              )}
              {plan && (
                <div className="text-sm text-muted-foreground space-y-1 mt-3 pt-3 border-t border-border/30">
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
          <p className="text-sm text-muted-foreground">{getSubscriptionStatus()}</p>
          <div className="billing-client-upgrade-wrapper">
            <BillingClient
              plans={allPlans}
              currentPlanId={plan?.id}
              currentPriceId={subscription?.price_id}
              currentBillingCycle={userBillingCycle}
              hasActiveSubscription={hasActiveSubscription}
              stripeCustomerId={subscription?.stripe_customer_id}
              cancelAtPeriodEnd={subscription?.cancel_at_period_end}
              planName={plan?.name}
              expiresAt={formattedExpiresAt}
              currentScreenCount={currentScreenCount}
              maxScreens={plan?.max_screens}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Payment Methods</h2>
            <p className="text-sm text-muted-foreground">Manage your payment methods and billing information.</p>
          </div>
        </div>
        {hasActiveSubscription ? (
          <PaymentMethodsManager />
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Payment methods will be available after subscribing
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/50 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Receipt className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Invoices</h2>
            <p className="text-sm text-muted-foreground">View and download your past invoices.</p>
          </div>
        </div>
        {hasActiveSubscription ? (
          <InvoicesList />
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Invoices will be available after your first payment
          </div>
        )}
      </div>

      {hasActiveSubscription && (
        <div className="flex justify-center pt-4 border-t border-border/50">
          <div className="billing-client-cancel-wrapper">
            <BillingClient
              plans={allPlans}
              currentPlanId={plan?.id}
              currentPriceId={subscription?.price_id}
              currentBillingCycle={userBillingCycle}
              hasActiveSubscription={hasActiveSubscription}
              stripeCustomerId={subscription?.stripe_customer_id}
              cancelAtPeriodEnd={subscription?.cancel_at_period_end}
              planName={plan?.name}
              expiresAt={formattedExpiresAt}
              currentScreenCount={currentScreenCount}
              maxScreens={plan?.max_screens}
            />
          </div>
        </div>
      )}
    </div>
  )
}
