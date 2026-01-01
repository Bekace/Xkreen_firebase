"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Check } from "lucide-react"
import Link from "next/link"
import { signUp } from "@/lib/actions"
import { OAuthButtons } from "@/components/oauth-buttons"

function SubmitButton({ isPaidPlan }: { isPaidPlan: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg font-medium rounded-lg h-[60px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating account...
        </>
      ) : isPaidPlan ? (
        "Continue to Payment"
      ) : (
        "Create Account"
      )}
    </Button>
  )
}

interface SignUpFormProps {
  selectedPlan?: {
    id: string
    name: string
    price: number
    billing_cycle: string
    features: string[]
    priceId?: string
    stripePriceId?: string
    trialDays?: number
  }
}

export default function SignUpForm({ selectedPlan }: SignUpFormProps) {
  const [state, formAction] = useActionState(signUp, null)

  const isPaidPlan = !!selectedPlan?.stripePriceId

  const oauthRedirectTo = isPaidPlan
    ? `/auth/oauth-checkout?planId=${selectedPlan.id}&priceId=${selectedPlan.priceId || ""}&stripePriceId=${selectedPlan.stripePriceId || ""}`
    : "/dashboard"

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-primary">Join XKREEN</h1>
        <p className="text-lg text-foreground">Create your digital signage account</p>
      </div>

      {selectedPlan && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Selected Plan</p>
              <p className="text-lg font-semibold text-foreground">{selectedPlan.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">${selectedPlan.price}</p>
              <p className="text-sm text-muted-foreground">/{selectedPlan.billing_cycle}</p>
            </div>
          </div>
          {selectedPlan.trialDays && selectedPlan.trialDays > 0 && (
            <p className="text-sm text-primary mb-2">{selectedPlan.trialDays}-day free trial included</p>
          )}
          <div className="space-y-1">
            {selectedPlan.features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-3 w-3 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <Link href="/auth/pricing" className="text-sm text-primary hover:underline block mt-3">
            Change plan
          </Link>
        </div>
      )}

      <OAuthButtons redirectTo={oauthRedirectTo} />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>

      <form action={formAction} className="space-y-6 bg-popover">
        {selectedPlan && (
          <>
            <input type="hidden" name="planId" value={selectedPlan.id} />
            {selectedPlan.priceId && <input type="hidden" name="priceId" value={selectedPlan.priceId} />}
            {selectedPlan.stripePriceId && (
              <input type="hidden" name="stripePriceId" value={selectedPlan.stripePriceId} />
            )}
          </>
        )}

        {state?.error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-700 px-4 py-3 rounded">
            <p className="font-medium">{state.success}</p>
            {state.requiresVerification && (
              <p className="text-sm mt-2">
                <Link href="/auth/login" className="underline">
                  Go to login page
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
              Full Name
            </label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="John Doe"
              required
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="companyName" className="block text-sm font-medium text-foreground">
              Company Name <span className="text-muted-foreground">(Optional)</span>
            </label>
            <Input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Acme Inc."
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-background border-border text-foreground"
            />
          </div>
        </div>

        <SubmitButton isPaidPlan={!!isPaidPlan} />

        <div className="text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
}
