"use client"

import { useState } from "react"
import { Mail, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const { toast } = useToast()

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address not found. Please sign up again.",
        variant: "destructive",
      })
      return
    }

    setResending(true)
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setResent(true)
        toast({
          title: "Email sent",
          description: "Verification email has been resent. Please check your inbox.",
        })
      } else {
        throw new Error("Failed to resend email")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-lg border-0 shadow-xl">
        <CardContent className="p-8 md:p-12">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full"></div>
              <div className="relative bg-cyan-500 rounded-full p-4">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 text-balance">Check Your Email</h1>
            <p className="text-gray-600 leading-relaxed text-pretty">
              We've sent a verification link to
              {email && (
                <>
                  <br />
                  <span className="font-semibold text-gray-900">{email}</span>
                </>
              )}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-cyan-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Check your inbox</p>
                <p className="text-sm text-gray-600">Click the verification link to activate your account</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-cyan-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Check spam folder</p>
                <p className="text-sm text-gray-600">Sometimes emails end up in spam or promotions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-cyan-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Link expires in 24 hours</p>
                <p className="text-sm text-gray-600">Request a new link if it expires</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={resending || resent}
              variant="outline"
              className="w-full border-gray-300 hover:bg-gray-50"
            >
              {resending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resending...
                </>
              ) : resent ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Email Resent
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>

            <Link href="/auth/login" className="block">
              <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>

          {/* Help text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Need help?{" "}
            <Link href="/contact" className="text-cyan-600 hover:text-cyan-700 font-medium underline">
              Contact support
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
