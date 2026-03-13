'use client'

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

export function AddPaymentMethodDialog({ open, onOpenChange, onSuccess }: AddPaymentMethodDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setLoading(true)
      createSetupIntent()
        .then((result) => {
          if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" })
            onOpenChange(false)
          } else if (result.clientSecret) {
            setClientSecret(result.clientSecret)
          }
        })
        .catch(() => {
          toast({ title: "Error", description: "Failed to initialize payment form", variant: "destructive" })
          onOpenChange(false)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      // Reset client secret when dialog is closed
      setClientSecret(null)
    }
  }, [open, toast, onOpenChange])

  const handleSuccess = () => {
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>Add a new credit or debit card to your account.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : clientSecret ? (
          <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm onSuccess={handleSuccess} onCancel={() => onOpenChange(false)} />
          </Elements>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            <p>Unable to load payment form. Please close and try again.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

const PaymentForm = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [formLoading, setFormLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setFormLoading(true)

    const { error } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    })

    if (error) {
      toast({ title: "Error", description: error.message || "Failed to add payment method", variant: "destructive" })
    } else {
      toast({ title: "Success", description: "Payment method added successfully" })
      onSuccess()
    }

    setFormLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="py-4">
        <PaymentElement />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={formLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || formLoading}>
          {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Add Payment Method"}
        </Button>
      </DialogFooter>
    </form>
  )
}
