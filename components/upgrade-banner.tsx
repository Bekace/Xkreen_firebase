import { AlertCircle, Zap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Plans ordered from lowest to highest tier
const PLAN_TIERS = ["Free", "Pro", "Enterprise"]

function getNextPlan(currentPlan: string | null | undefined): string | null {
  if (!currentPlan) return "Pro"
  const idx = PLAN_TIERS.findIndex(p => p.toLowerCase() === currentPlan.toLowerCase())
  if (idx === -1) return "Pro"
  // Already on highest plan
  if (idx >= PLAN_TIERS.length - 1) return null
  return PLAN_TIERS[idx + 1]
}

interface UpgradeBannerProps {
  feature: string
  description?: string
  currentPlan?: string | null
  className?: string
}

export function UpgradeBanner({ feature, description, currentPlan, className = "" }: UpgradeBannerProps) {
  const nextPlan = getNextPlan(currentPlan)

  // Don't show banner if already on highest plan
  if (!nextPlan) return null

  return (
    <Alert className={`border-cyan-200 bg-cyan-50 ${className}`}>
      <Zap className="h-5 w-5 text-cyan-600" />
      <AlertTitle className="text-cyan-900 font-semibold">Upgrade to {nextPlan} Required</AlertTitle>
      <AlertDescription className="text-cyan-800">
        <p className="mb-3">
          <strong>{feature}</strong> {description && `- ${description}`}
        </p>
        <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-700">
          <Link href="/dashboard/settings/subscription">
            <Zap className="h-4 w-4 mr-2" />
            Upgrade Now
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

interface UpgradeInlineProps {
  feature: string
  currentPlan?: string | null
}

export function UpgradeInline({ feature, currentPlan }: UpgradeInlineProps) {
  const nextPlan = getNextPlan(currentPlan)

  if (!nextPlan) return null

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4 text-cyan-600" />
      <span>
        {feature} requires {nextPlan} plan
      </span>
      <Button asChild variant="link" size="sm" className="text-cyan-600 p-0 h-auto">
        <Link href="/dashboard/settings/subscription">Upgrade</Link>
      </Button>
    </div>
  )
}
