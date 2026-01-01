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
  hasActiveSubscription?: boolean
  stripeCustomerId?: string | null
  cancelAtPeriodEnd?: boolean
  planName?: string
  expiresAt?: string
}

export default function BillingClient({
  plans,
  currentPlanId,
  hasActiveSubscription,
  cancelAtPeriodEnd,
  planName,
  expiresAt,
}: BillingClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      toast({
        title: "Success!",
        description: "Your plan has been upgraded successfully.",
      })
      window.history.replaceState({}, "", "/dashboard/settings/billing")
      router.refresh()
    }
  }, [searchParams, toast, router])

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

  return (
    <>
      <div className="flex gap-2">
        {hasActiveSubscription ? (
          cancelAtPeriodEnd ? (
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
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsCancelDialogOpen(true)}>
              Cancel Subscription
            </Button>
          )
        ) : (
          <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)}>
            Upgrade Plan
          </Button>
        )}
      </div>
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
