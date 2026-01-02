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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
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
      setLoading(true)
      createSetupIntent()
        .then((result) => {
          if (result.error) {
            toast({
              title: "Error",
              description: result.error,
              variant: "destructive",
            })
            onOpenChange(false)
          } else {
            setClientSecret(result.clientSecret!)
          }
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
              },
            }}
          >
            <PaymentForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
