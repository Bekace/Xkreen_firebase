"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Forgot Password</CardTitle>
              <CardDescription>
                Enter your email address and we&apos;ll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <Alert className="border-primary/50 bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-foreground">
                    Check your email for a password reset link. It may take a few minutes to arrive.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-6">
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </div>
                  </form>
                </>
              )}
              <div className="mt-4 text-center text-sm text-primary">
                <Link href="/auth/login" className="underline underline-offset-4">
                  Back to login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
