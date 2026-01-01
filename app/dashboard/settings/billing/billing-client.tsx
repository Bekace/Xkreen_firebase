"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import UpgradePlanDialog from "@/components/upgrade-plan-dialog"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import { createCustomerPortalSession } from "@/lib/actions/stripe"

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
}

export default function BillingClient({ plans, currentPlanId, hasActiveSubscription }: BillingClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
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

  const handleManageSubscription = async () => {
    try {
      setIsLoadingPortal(true)
      await createCustomerPortalSession()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      })
      setIsLoadingPortal(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {hasActiveSubscription ? (
          <Button size="sm" variant="outline" onClick={handleManageSubscription} disabled={isLoadingPortal}>
            {isLoadingPortal ? "Loading..." : "Manage Subscription"}
          </Button>
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
    </>
  )
}
