"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { createSetupIntent } from "@/lib/actions/stripe"
import { useToast } from "@/hooks/use-toast"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface AddPaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function PaymentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      console.log("[v0] Stripe or elements not ready", { stripe: !!stripe, elements: !!elements })
      return
    }

    setLoading(true)

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/settings/billing`,
      },
      redirect: "if_required",
    })

    if (error) {
      console.log("[v0] Error confirming setup:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method",
        variant: "destructive",
      })
      setLoading(false)
    } else {
      toast({
        title: "Success",
        description: "Payment method added successfully",
      })
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="py-4">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Payment Method"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function AddPaymentMethodDialog({ open, onOpenChange, onSuccess }: AddPaymentMethodDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && !clientSecret) {
      console.log("[v0] Creating setup intent...")
      setLoading(true)
      createSetupIntent()
        .then((result) => {
          console.log("[v0] Setup intent result:", { hasError: !!result.error, hasSecret: !!result.clientSecret })
          if (result.error) {
            toast({
              title: "Error",
              description: result.error,
              variant: "destructive",
            })
            onOpenChange(false)
          } else if (result.clientSecret) {
            setClientSecret(result.clientSecret)
          }
        })
        .catch((err) => {
          console.log("[v0] Setup intent error:", err)
          toast({
            title: "Error",
            description: "Failed to initialize payment form",
            variant: "destructive",
          })
          onOpenChange(false)
        })
        .finally(() => {
          setLoading(false)
        })
    }

    if (!open) {
      setClientSecret(null)
    }
  }, [open, clientSecret, toast, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>Add a new credit or debit card to your account</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#000000",
                },
              },
            }}
          >
            <PaymentForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
          </Elements>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            <p>Unable to load payment form. Please try again.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
