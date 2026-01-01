"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, CameraOff, Eye, EyeOff, AlertCircle, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { analyzeFrame, initializeModels, cleanup } from "@/lib/ai/vision-analytics"

interface CameraAnalyticsProps {
  screenId: string
  enabled?: boolean
  onToggle?: (enabled: boolean) => void
  className?: string
  onSetupClick?: () => void
}

interface AnalyticsData {
  personCount: number
  demographics: {
    male: number
    female: number
    unknown: number
  }
  ageGroups: {
    child: number
    teen: number
    adult: number
    senior: number
  }
  emotions: {
    happy: number
    neutral: number
    sad: number
    angry: number
    surprised: number
    unknown: number
  }
  lookingAtScreen: number
  timestamp: string
}

interface CameraConfig {
  deviceId: string
  settings: MediaTrackSettings
}

export function CameraAnalytics({
  screenId,
  enabled = false,
  onToggle,
  className,
  onSetupClick,
}: CameraAnalyticsProps) {
  console.log("[v0] CameraAnalytics component mounted with props:", { screenId, enabled })

  const [isActive, setIsActive] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastAnalytics, setLastAnalytics] = useState<AnalyticsData | null>(null)
  const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null)
  const [modelsReady, setModelsReady] = useState(false)
  const [latestFrame, setLatestFrame] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    console.log("[v0] CameraAnalytics state changed:", {
      isActive,
      enabled,
      modelsReady,
      hasCameraConfig: !!cameraConfig,
    })
  }, [isActive, enabled, modelsReady, cameraConfig])

  useEffect(() => {
    const savedConfig = localStorage.getItem("cameraConfig")
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setCameraConfig(config)
        console.log("[v0] Loaded camera configuration:", config)
      } catch (err) {
        console.error("[v0] Failed to parse camera config:", err)
      }
    } else {
      console.log("[v0] No camera configuration found in localStorage")
    }
  }, [])

  useEffect(() => {
    console.log("[v0] Initializing AI models...")
    initializeModels()
      .then(() => {
        console.log("[v0] AI models initialized successfully")
        setModelsReady(true)
      })
      .catch((err) => {
        console.error("[v0] Failed to initialize AI models:", err)
        setError("Failed to initialize AI models. Please refresh the page.")
      })

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (enabled && !isActive && modelsReady && cameraConfig) {
      console.log("[v0] Analytics enabled externally, auto-starting...")
      startAnalytics()
    }
  }, [enabled, modelsReady, cameraConfig])

  const requestCameraPermission = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: cameraConfig
          ? {
              deviceId: { exact: cameraConfig.deviceId },
              width: { ideal: cameraConfig.settings.width || 640 },
              height: { ideal: cameraConfig.settings.height || 480 },
              frameRate: { ideal: cameraConfig.settings.frameRate || 30 },
            }
          : {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
            },
      }

      console.log("[v0] Requesting camera with constraints:", constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
          console.log("[v0] Video playback started")

          // Wait for video to have metadata loaded
          await new Promise<void>((resolve) => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              resolve()
            } else {
              videoRef.current?.addEventListener("loadedmetadata", () => resolve(), { once: true })
            }
          })

          console.log("[v0] Video ready with dimensions:", {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
            readyState: videoRef.current.readyState,
          })
        } catch (playError) {
          console.error("[v0] Video play error:", playError)
        }
      }

      streamRef.current = stream
      setHasPermission(true)
      setError("")

      const videoTrack = stream.getVideoTracks()[0]
      const actualSettings = videoTrack.getSettings()
      console.log("[v0] Camera started with settings:", actualSettings)

      return true
    } catch (err) {
      console.error("[v0] Camera permission error:", err)
      if (cameraConfig) {
        setError("Configured camera not available. Please check camera setup.")
      } else {
        setError("Camera access denied. Please configure camera in Camera Setup.")
      }
      setHasPermission(false)
      return false
    }
  }, [cameraConfig])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setHasPermission(null)
  }, [])

  const captureAndAnalyze = useCallback(async () => {
    console.log("[v0] captureAndAnalyze called, checking conditions...")
    console.log("[v0] videoRef.current:", !!videoRef.current)
    console.log("[v0] canvasRef.current:", !!canvasRef.current)
    console.log("[v0] isProcessing:", isProcessing)

    if (!videoRef.current || !canvasRef.current || isProcessing) {
      console.log("[v0] Early return: missing refs or already processing")
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    console.log("[v0] Video dimensions:", {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
    })

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log("[v0] Early return: no context or video not ready")
      return
    }

    try {
      setIsProcessing(true)

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      console.log("[v0] Analyzing frame with AI vision...")

      const analytics = await analyzeFrame(canvas)

      console.log("[v0] AI analysis complete:", analytics)

      const response = await fetch("/api/analytics/process-frame", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          screenId,
          analytics: {
            personCount: analytics.personCount,
            demographics: analytics.demographics,
            ageGroups: analytics.ageGroups,
            emotions: analytics.emotions,
            lookingAtScreen: analytics.lookingAtScreen,
            timestamp: analytics.timestamp,
          },
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`)
      }

      const result = await response.json()
      console.log("[v0] Analytics stored:", result)

      setLastAnalytics(analytics)
      const frameDataUrl = canvas.toDataURL("image/jpeg", 0.8)
      setLatestFrame(frameDataUrl)
    } catch (err) {
      console.error("[v0] Frame analysis error:", err)
      setError(`Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }, [screenId, isProcessing])

  const startAnalytics = useCallback(async () => {
    console.log("[v0] startAnalytics called, current state:", { isActive, cameraConfig: !!cameraConfig, modelsReady })

    if (isActive) {
      console.log("[v0] Analytics already active, skipping start")
      return
    }

    if (!cameraConfig) {
      console.log("[v0] No camera config, cannot start")
      setError("Camera not configured. Click 'Setup' to configure your camera.")
      return
    }

    if (!modelsReady) {
      console.log("[v0] Models not ready, cannot start")
      setError("AI models loading. Please wait...")
      return
    }

    console.log("[v0] Requesting camera permission...")
    const hasCamera = await requestCameraPermission()
    console.log("[v0] Camera permission result:", hasCamera)

    if (hasCamera && isMountedRef.current) {
      setIsActive(true)
      console.log("[v0] Camera started, beginning frame capture every 30 seconds")

      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          console.log("[v0] Triggering frame capture...")
          captureAndAnalyze()
        }
      }, 30000)

      setTimeout(() => {
        if (isMountedRef.current) {
          console.log("[v0] Capturing first frame...")
          captureAndAnalyze()
        }
      }, 1000)
    } else {
      console.log("[v0] Failed to start analytics - camera permission denied or component unmounted")
    }
  }, [cameraConfig, modelsReady, requestCameraPermission, captureAndAnalyze, isActive])

  const stopAnalytics = useCallback(() => {
    console.log("[v0] Stopping analytics...")
    stopCamera()
    if (isMountedRef.current) {
      setIsActive(false)
      setLastAnalytics(null)
      setLatestFrame(null)
    }
  }, [stopCamera])

  const toggleAnalytics = useCallback(async () => {
    if (!isActive) {
      await startAnalytics()
      onToggle?.(true)
    } else {
      stopAnalytics()
      onToggle?.(false)
    }
  }, [isActive, startAnalytics, stopAnalytics, onToggle])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      console.log("[v0] Component unmounting, cleaning up...")
      isMountedRef.current = false

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
          console.log("[v0] Stopped camera track")
        })
        streamRef.current = null
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [])

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Audience Analytics
        </CardTitle>
        <div className="flex items-center gap-2">
          {!cameraConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (onSetupClick ? onSetupClick() : window.open("/dashboard/screens/camera-setup", "_blank"))}
              className="tv-focusable"
            >
              <Settings className="h-4 w-4 mr-2" />
              Setup
            </Button>
          )}
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={toggleAnalytics}
            disabled={isProcessing || !modelsReady}
            className="tv-focusable"
          >
            {isActive ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {modelsReady ? "Start" : "Loading..."}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <video ref={videoRef} autoPlay muted playsInline className="hidden" />
        <canvas ref={canvasRef} className="hidden" />

        {error && (
          <div className="flex items-start gap-2 p-3 text-sm bg-destructive/10 text-destructive rounded-md border border-destructive/20">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              {!cameraConfig && (
                <p className="text-xs mt-1 opacity-90">Go to Camera Setup to configure your camera for analytics.</p>
              )}
            </div>
          </div>
        )}

        {!modelsReady && !error && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading AI models for face detection and emotion analysis...</span>
          </div>
        )}

        {cameraConfig && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            Camera: {cameraConfig.settings.width}×{cameraConfig.settings.height} @ {cameraConfig.settings.frameRate}fps
          </div>
        )}

        {isActive && hasPermission && (
          <div className="space-y-4">
            {latestFrame && (
              <div className="space-y-2">
                <div className="font-medium text-sm">Latest Frame</div>
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  <img src={latestFrame || "/placeholder.svg"} alt="Latest captured frame" className="w-full h-auto" />
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Live</div>
                </div>
              </div>
            )}

            {lastAnalytics ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">People Count</div>
                  <div className="text-2xl font-bold text-primary">{lastAnalytics.personCount}</div>
                </div>

                <div>
                  <div className="font-medium">Looking at Screen</div>
                  <div className="text-2xl font-bold text-green-600">{lastAnalytics.lookingAtScreen}</div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium mb-2">Demographics</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Male: {lastAnalytics.demographics.male}</div>
                    <div>Female: {lastAnalytics.demographics.female}</div>
                    <div>Unknown: {lastAnalytics.demographics.unknown}</div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium mb-2">Age Groups</div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>Child: {lastAnalytics.ageGroups.child}</div>
                    <div>Teen: {lastAnalytics.ageGroups.teen}</div>
                    <div>Adult: {lastAnalytics.ageGroups.adult}</div>
                    <div>Senior: {lastAnalytics.ageGroups.senior}</div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium mb-2">Emotions</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Happy: {lastAnalytics.emotions.happy}</div>
                    <div>Neutral: {lastAnalytics.emotions.neutral}</div>
                    <div>Sad: {lastAnalytics.emotions.sad}</div>
                  </div>
                </div>

                <div className="col-span-2 text-xs text-muted-foreground">
                  Last updated: {new Date(lastAnalytics.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {isProcessing ? "Processing frame..." : "Waiting for analytics data..."}
              </div>
            )}
          </div>
        )}

        {!isActive && (
          <div className="text-center py-8 text-muted-foreground">
            <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {!cameraConfig ? (
              <>
                <p className="font-medium">Camera Not Configured</p>
                <p className="text-xs mt-1">Click the "Setup" button above to configure your camera</p>
              </>
            ) : !modelsReady ? (
              <>
                <p className="font-medium">Loading AI Models</p>
                <p className="text-xs mt-1">Preparing face detection and emotion analysis...</p>
              </>
            ) : enabled ? (
              <>
                <p className="font-medium">Starting Analytics</p>
                <p className="text-xs mt-1">Initializing camera...</p>
              </>
            ) : (
              <>
                <p className="font-medium">Analytics Disabled</p>
                <p className="text-xs mt-1">Click "Start" to begin audience analytics</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
