"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"
import Link from "next/link"

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
  features: {
    display_features?: string[]
    max_screens?: number
    max_playlists?: number
    max_media_storage_mb?: number
  }
  stripe_product_id: string | null
  prices: Price[]
}

interface PricingCardsProps {
  plans: Plan[]
}

function extractFeatures(plan: Plan): string[] {
  // If features has display_features array, use that
  if (plan.features?.display_features && Array.isArray(plan.features.display_features)) {
    return plan.features.display_features
  }

  // Otherwise, build features from plan limits
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

export default function PricingCards({ plans }: PricingCardsProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>No pricing plans available at the moment.</p>
      </div>
    )
  }

  const getPrice = (plan: Plan, cycle: "monthly" | "yearly"): Price | undefined => {
    return plan.prices.find((p) => p.billing_cycle === cycle)
  }

  const getDisplayPrice = (plan: Plan): string => {
    const price = getPrice(plan, billingCycle)
    if (!price || price.price === 0) return "$0"

    if (billingCycle === "yearly") {
      // Show monthly equivalent for yearly
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

  return (
    <div className="space-y-8">
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
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isRecommended = plan.name === "Pro"
          const features = extractFeatures(plan)
          const currentPrice = getPrice(plan, billingCycle)
          const savings = billingCycle === "yearly" ? getYearlySavings(plan) : null

          return (
            <Card
              key={plan.id}
              className={`relative p-8 ${isRecommended ? "border-primary shadow-lg scale-105" : "border-border"}`}
            >
              {isRecommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Recommended
                  </span>
                </div>
              )}

              <div className="space-y-6">
                {/* Plan Header */}
                <div>
                  <h3 className="text-2xl font-semibold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>

                {/* Pricing */}
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-foreground">{getDisplayPrice(plan)}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                {billingCycle === "yearly" && savings && (
                  <p className="text-sm text-primary">Save {savings}% with yearly billing</p>
                )}

                {currentPrice?.trial_days && currentPrice.trial_days > 0 && (
                  <p className="text-sm text-muted-foreground">{currentPrice.trial_days}-day free trial</p>
                )}

                {/* Features */}
                <ul className="space-y-3">
                  {features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link
                  href={`/auth/sign-up/${plan.id}?billing=${billingCycle}${currentPrice?.id ? `&priceId=${currentPrice.id}` : ""}`}
                  className="block"
                >
                  <Button
                    className={`w-full ${
                      isRecommended
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {currentPrice?.price === 0 ? "Start Free" : `Start with ${plan.name}`}
                  </Button>
                </Link>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
