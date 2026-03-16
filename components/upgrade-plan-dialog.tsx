"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, Loader2, Info } from "lucide-react"
import { createUpgradeCheckoutSession } from "@/lib/actions/stripe"
import { useToast } from "@/hooks/use-toast"

type Price = {
  id: string
  plan_id: string
  billing_cycle: "monthly" | "yearly" | "quarterly" | "lifetime"
  price: number
  stripe_price_id: string | null
  trial_days: number
  is_active: boolean
}

type Plan = {
  id: string
  name: string
  description: string
  max_screens: number
  max_playlists: number
  max_media_storage: number
  storage_unit: string
  features: {
    display_features?: string[]
    max_screens?: number
    max_playlists?: number
    max_media_storage_mb?: number
  }
  stripe_product_id: string | null
  prices: Price[]
}

interface UpgradePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plans: Plan[]
  currentPlanId?: string
  currentScreenCount?: number
  maxScreens?: number
}

function extractFeatures(plan: Plan): string[] {
  if (plan.features?.display_features && Array.isArray(plan.features.display_features)) {
    return plan.features.display_features
  }

  const displayFeatures: string[] = []

  if (plan.max_screens) {
    displayFeatures.push(
      plan.max_screens === -1
        ? "Unlimited screens"
        : `Up to ${plan.max_screens} screen${plan.max_screens > 1 ? "s" : ""}`,
    )
  }

  if (plan.max_playlists) {
    displayFeatures.push(
      plan.max_playlists === -1
        ? "Unlimited playlists"
        : `${plan.max_playlists} playlist${plan.max_playlists > 1 ? "s" : ""}`,
    )
  }

  if (plan.max_media_storage) {
    const storageGB = Math.round(plan.max_media_storage / 1024)
    displayFeatures.push(storageGB <= 0 ? "Unlimited storage" : `${storageGB}GB storage`)
  }

  return displayFeatures
}

function getPlanTier(plan: Plan): number {
  if (plan.name.toLowerCase() === "free") return 1
  if (plan.name.toLowerCase() === "pro") return 2
  if (plan.name.toLowerCase() === "enterprise") return 3
  if (plan.max_screens === -1) return 999
  return plan.max_screens
}

export default function UpgradePlanDialog({
  open,
  onOpenChange,
  plans,
  currentPlanId,
  currentScreenCount = 0,
  maxScreens = 0,
}: UpgradePlanDialogProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const currentPlan = plans.find((plan) => plan.id === currentPlanId)
  const currentTier = currentPlan ? getPlanTier(currentPlan) : 0

  const availablePlans = plans.filter((plan) => {
    if (plan.name.toLowerCase() === "free") return false
    return getPlanTier(plan) > currentTier
  })

  const availableSlots = maxScreens - currentScreenCount
  const hasAvailableSlots = availableSlots > 0
  const isFreePlan = currentPlan?.name.toLowerCase() === 'free';

  let welcomeMessage = null;
  if (isFreePlan && currentScreenCount >= 1) {
    welcomeMessage = (
        <p>Your Free plan includes one screen, which is currently in use. Upgrading will allow you to add more screens.</p>
    );
  } else if (isFreePlan && currentScreenCount === 0) {
      welcomeMessage = (
          <p>Your Free plan includes one free screen. You can upgrade to add more screens and unlock additional features.</p>
      );
  } else if (hasAvailableSlots) {
      welcomeMessage = (
          <>
              <p className="font-semibold">You have {availableSlots} available screen slots.</p>
              <p>Upgrading will use one of your available slots, and you won\'t be charged for it immediately.</p>
          </>
      );
  }
  const getPrice = (plan: Plan, cycle: "monthly" | "yearly"): Price | undefined => {
    return plan.prices.find((p) => p.billing_cycle === cycle && p.is_active)
  }

  const getDisplayPrice = (plan: Plan): string => {
    const price = getPrice(plan, billingCycle)
    if (!price || price.price === 0) return "$0"
    if (billingCycle === "yearly") {
      return `$${Math.round(price.price / 12)}`
    }
    return `$${price.price}`
  }

  const getYearlySavings = (plan: Plan): number | null => {
    const monthly = getPrice(plan, "monthly")
    const yearly = getPrice(plan, "yearly")
    if (!monthly || !yearly || monthly.price === 0) return null
    const yearlyMonthly = yearly.price / 12
    const savings = Math.round(((monthly.price - yearlyMonthly) / monthly.price) * 100)
    return savings > 0 ? savings : null
  }

  const handleUpgrade = async (planId: string) => {
    const price = getPrice(plans.find((p) => p.id === planId)!, billingCycle)
    if (!price) {
      toast({
        title: "Error",
        description: "Price not available for selected plan",
        variant: "destructive",
      })
      return
    }
    setIsLoading(planId)
    try {
      const result = await createUpgradeCheckoutSession(planId, price.id)
      if (result?.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        setIsLoading(null)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start upgrade process",
        variant: "destructive",
      })
      setIsLoading(null)
    }
  }

  if (availablePlans.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade Plan</DialogTitle>
            <DialogDescription>You are already on the highest plan.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>Choose a plan that fits your needs</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Limits Info */}
          <div className="border border-border/50 rounded-lg p-4 space-y-2">
            {welcomeMessage && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm flex items-start gap-3">
                <Info className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  {welcomeMessage}
                </div>
              </div>
            )}
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Plan Limits</span>
                <span className="font-mono text-xs px-2 py-1 bg-background rounded-md border border-border/50">
                  Screens: {currentScreenCount} / {maxScreens === -1 ? "Unlimited" : maxScreens}
                </span>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center">
            <div className="bg-muted p-1 rounded-lg inline-flex">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === "yearly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <span className="ml-2 text-xs text-primary">Save up to 20%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePlans.map((plan) => {
              const isRecommended = plan.name === "Pro"
              const features = extractFeatures(plan)
              const currentPrice = getPrice(plan, billingCycle)
              const savings = billingCycle === "yearly" ? getYearlySavings(plan) : null
              const loading = isLoading === plan.id

              return (
                <Card
                  key={plan.id}
                  className={`relative p-6 ${isRecommended ? "border-primary shadow-lg" : "border-border"}`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                        Recommended
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Plan Header */}
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">{plan.name}</h3>
                      <p className="text-muted-foreground text-xs">{plan.description}</p>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">{getDisplayPrice(plan)}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>

                    {billingCycle === "yearly" && savings && (
                      <p className="text-xs text-primary">Save {savings}% with yearly billing</p>
                    )}

                    {/* Features */}
                    <ul className="space-y-2">
                      {features.slice(0, 5).map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-xs text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading || !currentPrice}
                      className={`w-full ${
                        isRecommended
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
