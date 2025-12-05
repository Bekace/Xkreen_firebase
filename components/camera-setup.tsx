"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, CheckCircle, XCircle, AlertTriangle, Settings, Square } from "lucide-react"

interface CameraDevice {
  deviceId: string
  label: string
  kind: string
}

interface CameraSetupProps {
  onCameraConfigured?: (deviceId: string, settings: MediaTrackSettings) => void
}

export default function CameraSetup({ onCameraConfigured }: CameraSetupProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string>("")
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown")
  const [streamSettings, setStreamSettings] = useState<MediaTrackSettings | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Check camera permissions
  useEffect(() => {
    checkCameraPermissions()
  }, [])

  useEffect(() => {
    if (selectedCamera && !isStreaming) {
      startCameraTest()
    }
  }, [selectedCamera])

  const checkCameraPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: "camera" as PermissionName })
      setPermissionStatus(result.state)

      result.addEventListener("change", () => {
        setPermissionStatus(result.state)
      })
    } catch (err) {
      console.log("[v0] Permission API not supported, will check during camera access")
    }
  }

  const discoverCameras = async () => {
    setIsLoading(true)
    setError("")

    try {
      // Request permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())

      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind,
        }))

      setCameras(videoDevices)
      setPermissionStatus("granted")

      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId)
      }

      console.log("[v0] Discovered cameras:", videoDevices)
    } catch (err: any) {
      console.error("[v0] Camera discovery failed:", err)
      setError(`Camera access failed: ${err.message}`)
      setPermissionStatus("denied")
    } finally {
      setIsLoading(false)
    }
  }

  const startCameraTest = async () => {
    if (!selectedCamera) {
      console.log("[v0] No camera selected")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("[v0] Starting camera test for device:", selectedCamera)

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: selectedCamera },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      console.log("[v0] Got media stream:", stream)
      console.log("[v0] Video tracks:", stream.getVideoTracks())

      if (videoRef.current) {
        console.log("[v0] Attaching stream to video element")
        videoRef.current.srcObject = stream

        videoRef.current.onloadedmetadata = () => {
          console.log("[v0] Video metadata loaded")
          videoRef.current
            ?.play()
            .then(() => {
              console.log("[v0] Video playing successfully")
            })
            .catch((err) => {
              console.error("[v0] Video play failed:", err)
              setError(`Video playback failed: ${err.message}`)
            })
        }

        videoRef.current.onerror = (err) => {
          console.error("[v0] Video element error:", err)
          setError("Video element error occurred")
        }
      }

      // Get actual stream settings
      const videoTrack = stream.getVideoTracks()[0]
      const settings = videoTrack.getSettings()
      setStreamSettings(settings)
      setIsStreaming(true)

      console.log("[v0] Camera test started with settings:", settings)
    } catch (err: any) {
      console.error("[v0] Camera test failed:", err)
      setError(`Camera test failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const stopCameraTest = () => {
    console.log("[v0] Stopping camera test")

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log("[v0] Stopping track:", track.label)
        track.stop()
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsStreaming(false)
    setStreamSettings(null)
    console.log("[v0] Camera test stopped")
  }

  const confirmCameraSetup = () => {
    if (selectedCamera && streamSettings && onCameraConfigured) {
      onCameraConfigured(selectedCamera, streamSettings)
      console.log("[v0] Camera configuration confirmed:", { selectedCamera, streamSettings })
    }
  }

  const getPermissionBadge = () => {
    switch (permissionStatus) {
      case "granted":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Granted
          </Badge>
        )
      case "denied":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Denied
          </Badge>
        )
      case "prompt":
        return (
          <Badge variant="secondary">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Prompt
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Camera Hardware Setup
          </CardTitle>
          <CardDescription>Configure and test camera hardware for audience analytics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Camera Permission:</span>
            {getPermissionBadge()}
          </div>

          {/* Camera Discovery */}
          <div className="space-y-2">
            <Button onClick={discoverCameras} disabled={isLoading} className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              {isLoading ? "Discovering Cameras..." : "Discover Available Cameras"}
            </Button>

            {cameras.length > 0 && (
              <div className="text-sm text-muted-foreground">Found {cameras.length} camera(s)</div>
            )}
          </div>

          {/* Camera Selection */}
          {cameras.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Camera:</label>
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedCamera && isStreaming && (
            <Button onClick={stopCameraTest} variant="outline" className="w-full bg-transparent">
              <Square className="w-4 h-4 mr-2" />
              Stop Test
            </Button>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Camera Preview */}
      {selectedCamera && (
        <Card>
          <CardHeader>
            <CardTitle>Camera Preview</CardTitle>
            <CardDescription>Live feed from selected camera</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative w-full max-w-2xl mx-auto bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-auto"
                  autoPlay
                  muted
                  playsInline
                  style={{ minHeight: "400px" }}
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Initializing camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stream Settings */}
              {streamSettings && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Resolution:</span>
                    <span className="ml-2">
                      {streamSettings.width} × {streamSettings.height}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Frame Rate:</span>
                    <span className="ml-2">{streamSettings.frameRate} fps</span>
                  </div>
                  <div>
                    <span className="font-medium">Device:</span>
                    <span className="ml-2">{cameras.find((c) => c.deviceId === selectedCamera)?.label}</span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
                      {isStreaming ? "Active" : "Initializing"}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Confirm Setup */}
              {isStreaming && (
                <Button onClick={confirmCameraSetup} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Camera Setup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
