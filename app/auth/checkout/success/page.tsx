"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session_id")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      // Verify the session and wait for webhook processing
      setTimeout(() => {
        setLoading(false)
      }, 2000)
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Processing your subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Subscription Successful!</h1>
          <p className="text-lg text-muted-foreground">
            Your subscription has been activated with a 14-day free trial.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-2 text-left">
          <p className="text-sm text-muted-foreground">What's next?</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5" />
              <span>You won't be charged for 14 days</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5" />
              <span>Access all premium features immediately</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5" />
              <span>Cancel anytime before the trial ends</span>
            </li>
          </ul>
        </div>

        <Button onClick={() => router.push("/dashboard")} className="w-full bg-primary hover:bg-primary/90" size="lg">
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
