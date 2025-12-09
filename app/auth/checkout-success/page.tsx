export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Check, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CheckoutSuccessPageProps {
  searchParams: {
    session_id?: string
  }
}

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const sessionId = searchParams.session_id

  if (!sessionId) {
    redirect("/auth/pricing")
  }

  let session
  let planName = "your plan"

  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    })

    // Get plan name from metadata
    const planId = session.metadata?.plan_id
    if (planId) {
      const supabase = await createClient()
      const { data: plan } = await supabase.from("subscription_plans").select("name").eq("id", planId).single()

      if (plan) {
        planName = plan.name
      }
    }
  } catch (error) {
    console.error("[v0] Error retrieving checkout session:", error)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-10 w-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Payment Successful!</h1>
          <p className="text-lg text-muted-foreground">Welcome to the {planName} plan</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3 text-left">
            <Mail className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-medium text-foreground">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a confirmation email. Please verify your email address to activate your account.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link href="/auth/login" className="block">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In to Dashboard
            </Button>
          </Link>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full bg-transparent">
              Return to Home
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Your subscription is now active. You can manage your billing in the dashboard settings.
        </p>
      </div>
    </div>
  )
}
