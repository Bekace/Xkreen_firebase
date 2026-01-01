import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Checkout Error</CardTitle>
          </div>
          <CardDescription>There was a problem setting up your checkout session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/auth/pricing">Back to Pricing</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function OAuthCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string; priceId?: string; stripePriceId?: string }>
}) {
  try {
    const { planId, priceId, stripePriceId: urlStripePriceId } = await searchParams
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    if (!planId) {
      redirect("/auth/pricing")
    }

    let stripePriceId = urlStripePriceId

    if (!stripePriceId && priceId) {
      const { data: priceData } = await supabase
        .from("subscription_prices")
        .select("stripe_price_id")
        .eq("id", priceId)
        .single()

      stripePriceId = priceData?.stripe_price_id
    }

    if (!stripePriceId) {
      const { data: defaultPrice } = await supabase
        .from("subscription_prices")
        .select("stripe_price_id")
        .eq("plan_id", planId)
        .eq("billing_cycle", "monthly")
        .single()

      stripePriceId = defaultPrice?.stripe_price_id
    }

    if (!stripePriceId) {
      return (
        <ErrorDisplay message="Could not find pricing information for this plan. Please try selecting a plan again." />
      )
    }

    // Check if user already has an active subscription
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    if (existingSub) {
      redirect("/dashboard")
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id)
      .single()

    let stripeCustomerId = profile?.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || user.user_metadata?.full_name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      stripeCustomerId = customer.id

      await supabase.from("profiles").update({ stripe_customer_id: stripeCustomerId }).eq("id", user.id)
    }

    // Get plan details for trial
    const { data: plan } = await supabase.from("subscription_plans").select("trial_days").eq("id", planId).single()

    // Create Stripe Checkout session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/auth/pricing`,
      subscription_data: {
        trial_period_days: plan?.trial_days || undefined,
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId,
          price_id: priceId || "",
        },
      },
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
        price_id: priceId || "",
      },
    })

    if (session.url) {
      redirect(session.url)
    }

    return <ErrorDisplay message="Failed to create checkout session. Please try again." />
  } catch (error) {
    console.error("[v0] OAuth checkout error:", error)
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return <ErrorDisplay message={message} />
  }
}
