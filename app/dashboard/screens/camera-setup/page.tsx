"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import CameraSetup from "@/components/camera-setup"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle, Eye } from "lucide-react"

export default function CameraSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const screenId = searchParams.get("screenId")

  const [isConfigured, setIsConfigured] = useState(false)
  const [cameraConfig, setCameraConfig] = useState<{
    deviceId: string
    settings: MediaTrackSettings
  } | null>(null)

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (screenId) {
      fetchAnalyticsSettings()
    }
  }, [screenId])

  const fetchAnalyticsSettings = async () => {
    if (!screenId) return

    try {
      const response = await fetch(`/api/analytics/settings?screenId=${screenId}`)
      if (response.ok) {
        const settings = await response.json()
        setAnalyticsEnabled(settings.enabled)
        console.log("[v0] Loaded analytics settings:", settings)
      }
    } catch (error) {
      console.error("[v0] Error loading analytics settings:", error)
    }
  }

  const handleAnalyticsToggle = async (enabled: boolean) => {
    if (!screenId) {
      console.error("[v0] No screen ID provided")
      return
    }

    setSavingSettings(true)
    try {
      const response = await fetch("/api/analytics/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenId,
          enabled,
        }),
      })

      if (response.ok) {
        setAnalyticsEnabled(enabled)
        console.log("[v0] Analytics settings updated:", enabled)
      } else {
        console.error("[v0] Failed to update analytics settings")
      }
    } catch (error) {
      console.error("[v0] Error updating analytics settings:", error)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleCameraConfigured = (deviceId: string, settings: MediaTrackSettings) => {
    setCameraConfig({ deviceId, settings })
    setIsConfigured(true)

    // Store camera configuration in localStorage for the player to use
    localStorage.setItem("cameraConfig", JSON.stringify({ deviceId, settings }))

    console.log("[v0] Camera configuration saved:", { deviceId, settings })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Camera Hardware Setup</h1>
          <p className="text-muted-foreground">Configure camera hardware for audience analytics</p>
        </div>
      </div>

      {!isConfigured ? (
        <CameraSetup onCameraConfigured={handleCameraConfigured} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Camera Setup Complete
              </CardTitle>
              <CardDescription>Your camera is configured and ready for audience analytics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Resolution:</span>
                  <span className="ml-2">
                    {cameraConfig?.settings.width} × {cameraConfig?.settings.height}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Frame Rate:</span>
                  <span className="ml-2">{cameraConfig?.settings.frameRate} fps</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setIsConfigured(false)} variant="outline">
                  Reconfigure Camera
                </Button>
                <Button onClick={() => router.push("/dashboard/screens")}>Continue to Screens</Button>
              </div>
            </CardContent>
          </Card>

          {screenId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Analytics Settings
                </CardTitle>
                <CardDescription>Enable AI-powered audience analytics for this screen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics-toggle" className="text-base">
                      Enable Camera Analytics
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Analyze audience demographics, emotions, and engagement in real-time
                    </p>
                  </div>
                  <Switch
                    id="analytics-toggle"
                    checked={analyticsEnabled}
                    onCheckedChange={handleAnalyticsToggle}
                    disabled={savingSettings}
                  />
                </div>

                {analyticsEnabled && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Privacy & Compliance</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>✓ All processing happens locally in the browser</li>
                      <li>✓ No images or videos are stored</li>
                      <li>✓ Only anonymized metrics are saved</li>
                      <li>✓ GDPR compliant data handling</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
