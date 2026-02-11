import { AlertCircle, Zap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface UpgradeBannerProps {
  feature: string
  description?: string
  planRequired?: string
  className?: string
}

export function UpgradeBanner({ feature, description, planRequired = "Pro", className = "" }: UpgradeBannerProps) {
  return (
    <Alert className={`border-cyan-200 bg-cyan-50 ${className}`}>
      <Zap className="h-5 w-5 text-cyan-600" />
      <AlertTitle className="text-cyan-900 font-semibold">Upgrade to {planRequired} Required</AlertTitle>
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
  planRequired?: string
}

export function UpgradeInline({ feature, planRequired = "Pro" }: UpgradeInlineProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4 text-cyan-600" />
      <span>
        {feature} requires {planRequired} plan
      </span>
      <Button asChild variant="link" size="sm" className="text-cyan-600 p-0 h-auto">
        <Link href="/dashboard/settings/subscription">Upgrade</Link>
      </Button>
    </div>
  )
}
