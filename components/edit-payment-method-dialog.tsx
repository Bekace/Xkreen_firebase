"use client"

import type React from "react"

import { useState } from "react"
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
import { Loader2, CreditCard } from "lucide-react"
import { createSetupIntent, removePaymentMethod } from "@/lib/actions/stripe"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface EditPaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  paymentMethod: {
    id: string
    brand?: string
    last4?: string
  }
}

function PaymentForm({
  onSuccess,
  onCancel,
  oldPaymentMethodId,
  oldCardInfo,
}: {
  onSuccess: () => void
  onCancel: () => void
  oldPaymentMethodId: string
  oldCardInfo: string
}) {
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

    // Confirm the new payment method setup
    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/settings/billing`,
      },
      redirect: "if_required",
    })

    if (confirmError) {
      toast({
        title: "Error",
        description: confirmError.message || "Failed to add new payment method",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // Remove the old payment method
    const removeResult = await removePaymentMethod(oldPaymentMethodId)
    if (removeResult.error) {
      toast({
        title: "Warning",
        description: "New card added but couldn't remove old card. You may need to remove it manually.",
        variant: "destructive",
      })
    }

    toast({
      title: "Success",
      description: "Payment method updated successfully",
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertDescription>Replacing {oldCardInfo}</AlertDescription>
      </Alert>
      <PaymentElement />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Payment Method"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EditPaymentMethodDialog({
  open,
  onOpenChange,
  onSuccess,
  paymentMethod,
}: EditPaymentMethodDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleOpenChange = async (newOpen: boolean) => {
    if (newOpen && !clientSecret) {
      setLoading(true)
      const result = await createSetupIntent()
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      setClientSecret(result.clientSecret!)
      setLoading(false)
    }

    // Reset clientSecret when closing
    if (!newOpen) {
      setClientSecret(null)
    }

    onOpenChange(newOpen)
  }

  const cardInfo = `${paymentMethod.brand?.charAt(0).toUpperCase()}${paymentMethod.brand?.slice(1)} •••• ${paymentMethod.last4}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Payment Method</DialogTitle>
          <DialogDescription>
            Add a new card to replace your current payment method. The old card will be automatically removed.
          </DialogDescription>
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
            <PaymentForm
              onSuccess={onSuccess}
              onCancel={() => onOpenChange(false)}
              oldPaymentMethodId={paymentMethod.id}
              oldCardInfo={cardInfo}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
