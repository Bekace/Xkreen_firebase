"use client"

import { useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { cancelSubscription } from "@/lib/actions/stripe"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface CancelSubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planName: string
  expiresAt?: string
}

const CANCELLATION_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "switched_service", label: "Switched to another service" },
  { value: "unused", label: "Not using it enough" },
  { value: "customer_service", label: "Unhappy with customer service" },
  { value: "too_complex", label: "Too complex to use" },
  { value: "other", label: "Other reason" },
]

export function CancelSubscriptionDialog({ open, onOpenChange, planName, expiresAt }: CancelSubscriptionDialogProps) {
  const [reason, setReason] = useState<string>("")
  const [feedback, setFeedback] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCancel = async () => {
    if (!reason) {
      toast({
        title: "Please select a reason",
        description: "Help us understand why you're canceling.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await cancelSubscription(reason, feedback)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Subscription canceled",
          description: `Your ${planName} plan will remain active until ${expiresAt || "the end of your billing period"}.`,
        })
        onOpenChange(false)
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Cancel {planName} Subscription
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            We're sorry to see you go. Your subscription will remain active until{" "}
            {expiresAt || "the end of your billing period"}, and you won't be charged again.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Why are you canceling? (Required)</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {CANCELLATION_REASONS.map((item) => (
                <div key={item.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value} className="font-normal cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Additional feedback (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us more about your experience..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isLoading || !reason}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Canceling...
              </>
            ) : (
              "Confirm Cancellation"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
