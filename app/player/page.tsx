"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Monitor, Wifi, Copy, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PlayerSetupPage() {
  const [deviceCode, setDeviceCode] = useState("")
  const [isRegistering, setIsRegistering] = useState(true)
  const [isPaired, setIsPaired] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const generateAndRegisterDevice = async () => {
      console.log("[v0] Generating device code and registering device")

      // Generate unique device code
      const code = `DEV-${Date.now().toString(36).toUpperCase()}`
      setDeviceCode(code)

      try {
        // Register device with API
        const response = await fetch("/api/devices/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            device_code: code,
            device_info: {
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              url: window.location.href,
            },
          }),
        })

        const data = await response.json()
        console.log("[v0] Device registration response:", data)

        if (!response.ok) {
          throw new Error(data.error || "Failed to register device")
        }

        setIsRegistering(false)
        console.log("[v0] Device registered successfully, starting pairing poll")

        // Start polling for pairing status
        startPairingPoll(code)
      } catch (err) {
        console.log("[v0] Device registration error:", err)
        setError(err instanceof Error ? err.message : "Failed to register device")
        setIsRegistering(false)
      }
    }

    generateAndRegisterDevice()
  }, [])

  const startPairingPoll = (code: string) => {
    let pollCount = 0
    const startTime = Date.now()

    const pollInterval = setInterval(async () => {
      try {
        pollCount++
        const currentTime = Date.now()
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000)

        console.log(`[v0] === PAIRING POLL #${pollCount} (${elapsedSeconds}s elapsed) ===`)
        console.log("[v0] Checking pairing status for device:", code)

        const url = `/api/devices/status/${code}`
        console.log("[v0] Making request to:", url)

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          cache: "no-store",
        })
        console.log("[v0] Response status:", response.status)

        const data = await response.json()
        console.log("[v0] Response data:", data)

        if (response.ok && data.device?.is_paired && data.device?.screen_id) {
          console.log("[v0] === PAIRING DETECTED! ===")
          console.log("[v0] Device paired successfully after", pollCount, "polls and", elapsedSeconds, "seconds")
          console.log("[v0] Final device state:", {
            isPaired: data.device.is_paired,
            screenId: data.device.screen_id,
            lastHeartbeat: data.device.last_heartbeat,
          })
          console.log("[v0] Redirecting to player immediately...")

          setIsPaired(true)
          clearInterval(pollInterval)

          router.push(`/player/${code}`)
        } else {
          console.log("[v0] Device not yet paired:", {
            isPaired: data.device?.is_paired,
            screenId: data.device?.screen_id,
            pollCount,
            elapsedSeconds,
          })
        }
      } catch (err) {
        console.log("[v0] Pairing status check error:", err)
      }
    }, 2000) // Reduce polling interval to 2 seconds for faster detection

    // Clean up interval after 10 minutes
    setTimeout(
      () => {
        console.log("[v0] Pairing poll timeout after 10 minutes")
        clearInterval(pollInterval)
      },
      10 * 60 * 1000,
    )
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(deviceCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.log("[v0] Failed to copy to clipboard:", err)
    }
  }

  if (isPaired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-800">Device Paired!</h2>
            <p className="text-green-700">Redirecting to content player...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Monitor className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Device Player</h1>
            <p className="text-muted-foreground">
              {isRegistering ? "Setting up device..." : "Waiting for pairing from dashboard"}
            </p>
          </div>
        </div>

        {/* Device Code Display */}
        {!isRegistering && !error && (
          <Card className="border-border">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Wifi className="h-5 w-5" />
                Device Code
              </CardTitle>
              <CardDescription>Enter this code in your dashboard to pair this device</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="p-4 bg-muted rounded-lg border-2 border-dashed border-border">
                  <div className="text-3xl font-mono font-bold text-primary tracking-wider">{deviceCode}</div>
                </div>

                <Button onClick={copyToClipboard} variant="outline" className="w-full bg-transparent" disabled={copied}>
                  {copied ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isRegistering && (
          <Card className="border-border">
            <CardContent className="pt-6 text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Generating device code...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-destructive font-medium">Error: {error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!isRegistering && !error && (
          <Card className="border-border bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm text-muted-foreground">
                <h3 className="font-semibold text-foreground">How to pair:</h3>
                <ol className="space-y-2 list-decimal list-inside">
                  <li>Copy the device code shown above</li>
                  <li>Go to your dashboard and create a new screen</li>
                  <li>Enter this device code when prompted</li>
                  <li>Your content will start displaying automatically</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
