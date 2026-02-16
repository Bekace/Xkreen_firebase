"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import UpgradePlanDialog from "@/components/upgrade-plan-dialog"
import { CancelSubscriptionDialog } from "@/components/cancel-subscription-dialog"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import { reactivateSubscription } from "@/lib/actions/stripe"
import { Loader2 } from "lucide-react"

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

interface BillingClientProps {
  plans: Plan[]
  currentPlanId?: string
  currentPriceId?: string
  currentBillingCycle?: "monthly" | "yearly" | "quarterly" | "lifetime"
  hasActiveSubscription?: boolean
  stripeCustomerId?: string | null
  cancelAtPeriodEnd?: boolean
  planName?: string
  expiresAt?: string
}

export default function BillingClient({
  plans,
  currentPlanId,
  currentPriceId,
  currentBillingCycle,
  hasActiveSubscription,
  cancelAtPeriodEnd,
  planName,
  expiresAt,
}: BillingClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isChangingCycle, setIsChangingCycle] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const verifyPayment = async () => {
      if (searchParams.get("upgraded") === "true") {
        console.log("[v0] Returned from checkout, verifying payment...")
        
        try {
          const response = await fetch("/api/verify-payment", {
            method: "POST",
          })
          const data = await response.json()

          if (response.ok && data.updated) {
            console.log("[v0] Payment verified, plan updated")
            toast({
              title: "Success!",
              description: "Your plan has been upgraded successfully.",
            })
          } else {
            console.error("[v0] Payment verification failed:", data)
            toast({
              title: "Processing...",
              description: "Your payment is being processed. Please refresh in a moment.",
            })
          }
        } catch (error) {
          console.error("[v0] Verify payment error:", error)
        }

        window.history.replaceState({}, "", "/dashboard/settings/billing")
        setTimeout(() => router.refresh(), 1500)
      }
    }

    verifyPayment()
  }, [searchParams, toast, router])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/sync-subscription", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync")
      }

      toast({
        title: "Success!",
        description: "Subscription synced successfully. Refreshing...",
      })

      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (error) {
      console.error("[v0] Sync error:", error)
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync subscription",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleChangeBillingCycle = async () => {
    if (!currentPlanId || !hasActiveSubscription) return
    
    setIsChangingCycle(true)
    try {
      // Find the current plan
      const currentPlan = plans.find(p => p.id === currentPlanId)
      if (!currentPlan) {
        throw new Error("Current plan not found")
      }

      // Find the price for the opposite billing cycle
      const targetCycle = currentBillingCycle === "monthly" ? "yearly" : "monthly"
      const targetPrice = currentPlan.prices.find(p => p.billing_cycle === targetCycle && p.is_active)
      
      if (!targetPrice) {
        throw new Error(`${targetCycle} billing not available for this plan`)
      }

      // Call the upgrade checkout with the new price
      const { createUpgradeCheckoutSession } = await import("@/lib/actions/stripe")
      const result = await createUpgradeCheckoutSession(currentPlanId, targetPrice.id)

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error("[v0] Change billing cycle error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change billing cycle",
        variant: "destructive",
      })
    } finally {
      setIsChangingCycle(false)
    }
  }

  const handleReactivate = async () => {
    setIsReactivating(true)
    try {
      const result = await reactivateSubscription()

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Subscription reactivated",
          description: "Your subscription will continue as normal.",
        })
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reactivate subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsReactivating(false)
    }
  }

  const renderUpgradeButton = () => {
    if (hasActiveSubscription && cancelAtPeriodEnd) {
      return (
        <Button size="sm" variant="default" onClick={handleReactivate} disabled={isReactivating}>
          {isReactivating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reactivating...
            </>
          ) : (
            "Reactivate Subscription"
          )}
        </Button>
      )
    }

    return (
      <Button size="sm" variant="default" onClick={() => setIsDialogOpen(true)}>
        Upgrade plan
      </Button>
    )
  }

  const renderChangeBillingCycleButton = () => {
    if (!hasActiveSubscription || cancelAtPeriodEnd || !currentBillingCycle) {
      return null
    }

    // Don't show for Free plan or if current plan doesn't support the other billing cycle
    const currentPlan = plans.find(p => p.id === currentPlanId)
    const targetCycle = currentBillingCycle === "monthly" ? "yearly" : "monthly"
    const hasTargetCycle = currentPlan?.prices.some(p => p.billing_cycle === targetCycle && p.is_active)

    if (!hasTargetCycle) {
      return null
    }

    const buttonText = currentBillingCycle === "monthly" ? "Change to annual billing" : "Change to monthly billing"

    return (
      <Button 
        size="sm" 
        variant="outline" 
        onClick={handleChangeBillingCycle} 
        disabled={isChangingCycle}
      >
        {isChangingCycle ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          buttonText
        )}
      </Button>
    )
  }

  const renderCancelLink = () => {
    if (!hasActiveSubscription || cancelAtPeriodEnd) {
      return null
    }

    return (
      <button
        onClick={() => setIsCancelDialogOpen(true)}
        className="text-sm text-muted-foreground hover:text-destructive underline-offset-4 hover:underline transition-colors"
      >
        Cancel subscription
      </button>
    )
  }

  return (
    <>
      <div className="billing-actions-upgrade flex gap-2">
        {renderUpgradeButton()}
        {renderChangeBillingCycleButton()}
      </div>

      <div className="billing-actions-cancel">{renderCancelLink()}</div>

      <UpgradePlanDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        plans={plans}
        currentPlanId={currentPlanId}
      />
      <CancelSubscriptionDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        planName={planName || ""}
        expiresAt={expiresAt}
      />
    </>
  )
}
