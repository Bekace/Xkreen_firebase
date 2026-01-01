"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { X, Mail, Loader2 } from "lucide-react"

export function EmailVerificationBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isVerified, setIsVerified] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const checkVerification = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check if email is confirmed
        const emailConfirmed = user.email_confirmed_at !== null
        setIsVerified(emailConfirmed)

        // Show banner if not verified and not dismissed
        const dismissed = localStorage.getItem("email-verification-dismissed")
        if (!emailConfirmed && !dismissed) {
          setIsVisible(true)
        }
      }
    }

    checkVerification()
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    // Remember dismissal for 24 hours
    localStorage.setItem("email-verification-dismissed", Date.now().toString())
  }

  const handleResendVerification = async () => {
    setIsSending(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.email) {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: user.email,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })

        if (error) {
          setMessage("Failed to send verification email. Please try again.")
        } else {
          setMessage("Verification email sent! Check your inbox.")
        }
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  if (!isVisible || isVerified) {
    return null
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-foreground">Please verify your email address to unlock all features.</p>
        </div>
        <div className="flex items-center gap-2">
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
          <Button variant="outline" size="sm" onClick={handleResendVerification} disabled={isSending}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend email"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
