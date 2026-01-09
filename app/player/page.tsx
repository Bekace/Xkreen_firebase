"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { PlayerSplash } from "@/components/player-splash"
import Image from "next/image"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  weight: ["200"],
  variable: "--font-inter",
})

export default function PlayerSetupPage() {
  const [showSplash, setShowSplash] = useState(true)
  const [deviceCode, setDeviceCode] = useState("")
  const [isRegistering, setIsRegistering] = useState(true)
  const [isPaired, setIsPaired] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    window.displayPairingCode = (code: string) => {
      console.log("[v0] Received pairing code from Android:", code)
      if (code && typeof code === "string" && code.length > 0) {
        setDeviceCode(code)
        localStorage.setItem("xkreen_device_code", code)
        setIsRegistering(false)
        registerDeviceWithCode(code)
      }
    }

    return () => {
      delete window.displayPairingCode
    }
  }, [])

  const signalAndroidPairingComplete = useCallback(() => {
    if (window.AndroidInterface && typeof window.AndroidInterface.onPairingComplete === "function") {
      window.AndroidInterface.onPairingComplete()
      console.log("[v0] Signaled native Android app: onPairingComplete()")
    } else {
      console.warn("[v0] AndroidInterface.onPairingComplete() not found. Running in non-native environment.")
    }
  }, [])

  const registerDeviceWithCode = async (code: string) => {
    try {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 3000) // 3 seconds

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (showSplash) return

    const generateAndRegisterDevice = async () => {
      const storedCode = localStorage.getItem("xkreen_device_code")

      if (storedCode) {
        console.log("[v0] Found existing device code in localStorage:", storedCode)

        // Check if device is already paired by fetching its status
        try {
          const statusResponse = await fetch(`/api/devices/status/${storedCode}`)
          const statusData = await statusResponse.json()

          if (statusResponse.ok && statusData.device?.is_paired && statusData.device?.screen_id) {
            console.log("[v0] Device already paired, redirecting to player")
            signalAndroidPairingComplete()
            router.push(`/player/${storedCode}`)
            return
          }
        } catch (err) {
          console.log("[v0] Error checking device status:", err)
        }

        // Device exists but not paired yet, show pairing screen
        setDeviceCode(storedCode)
        setIsRegistering(false)
        startPairingPoll(storedCode)
        return
      }

      console.log("[v0] Generating new device code and registering device")

      // Generate unique 5-character alphanumeric code (uppercase letters and numbers)
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      let code = ""
      for (let i = 0; i < 5; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length))
      }
      // Add timestamp-based suffix to ensure uniqueness
      const timestamp = Date.now().toString(36).toUpperCase()
      code = (code + timestamp).substring(0, 5)

      localStorage.setItem("xkreen_device_code", code)
      console.log("[v0] Stored device code in localStorage:", code)

      setDeviceCode(code)
      registerDeviceWithCode(code)
    }

    generateAndRegisterDevice()
  }, [showSplash, signalAndroidPairingComplete, router])

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
          signalAndroidPairingComplete()
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

  if (showSplash) {
    return <PlayerSplash />
  }

  if (isPaired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-white relative">
        {/* Background Image */}
        <div className="absolute inset-0 -z-10">
          <Image src="/images/desktop-20-204.png" alt="Background" fill className="object-cover" priority />
        </div>

        {/* Logo - 20% bigger */}
        <div className="mb-12">
          <Image src="/xkreen-logo.svg" alt="Xkreen" width={480} height={96} className="w-auto h-24" priority />
        </div>

        {/* Instructional Text */}
        <p className="text-cyan-400 text-xl mb-12 font-light tracking-wide">
          Enter this code in your dashboard to pair this device
        </p>

        {/* Device Code Display */}
        <div className="text-center mb-16">
          <div className={`text-8xl tracking-[0.3em] text-white mb-4 ${inter.className}`} style={{ fontWeight: 200 }}>
            {deviceCode}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center space-y-3 max-w-xl">
          <h3 className="text-white text-lg font-normal mb-4">How to pair:</h3>
          <ol className="text-white text-base font-light space-y-2 text-left list-none">
            <li className="flex items-start">
              <span className="mr-3 text-cyan-400">1.</span>
              <span>Go to your dashboard and create a new screen</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-cyan-400">2.</span>
              <span>Enter this device code when prompted</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-cyan-400">3.</span>
              <span>Your content will start displaying automatically</span>
            </li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-white relative">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <Image src="/images/desktop-20-204.png" alt="Background" fill className="object-cover" priority />
      </div>

      {/* Logo - 20% bigger */}
      <div className="mb-12">
        <Image src="/xkreen-logo.svg" alt="Xkreen" width={480} height={96} className="w-auto h-24" priority />
      </div>

      {/* Instructional Text */}
      <p className="text-cyan-400 text-xl mb-12 font-light tracking-wide">
        Enter this code in your dashboard to pair this device
      </p>

      {/* Device Code Display */}
      {!isRegistering && !error && (
        <div className="text-center mb-16">
          <div className={`text-8xl tracking-[0.3em] text-white mb-4 ${inter.className}`} style={{ fontWeight: 200 }}>
            {deviceCode}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isRegistering && (
        <div className="text-8xl font-thin tracking-[0.3em] text-white/50 mb-16 animate-pulse">••••••</div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center mb-16">
          <p className="text-red-400 text-xl mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-cyan-400 underline hover:text-cyan-300 transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center space-y-3 max-w-xl">
        <h3 className="text-white text-lg font-normal mb-4">How to pair:</h3>
        <ol className="text-white text-base font-light space-y-2 text-left list-none">
          <li className="flex items-start">
            <span className="mr-3 text-cyan-400">1.</span>
            <span>Copy the device code shown above</span>
          </li>
          <li className="flex items-start">
            <span className="mr-3 text-cyan-400">2.</span>
            <span>Go to your dashboard and create a new screen</span>
          </li>
          <li className="flex items-start">
            <span className="mr-3 text-cyan-400">3.</span>
            <span>Enter this device code when prompted</span>
          </li>
          <li className="flex items-start">
            <span className="mr-3 text-cyan-400">4.</span>
            <span>Your content will start displaying automatically</span>
          </li>
        </ol>
      </div>
    </div>
  )
}
