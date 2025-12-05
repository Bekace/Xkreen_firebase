import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  console.log("[v0] Fetching available devices")

  try {
    const supabase = await createClient()
    if (!supabase) {
      console.log("[v0] Failed to create Supabase client")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log("[v0] Authentication failed:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get unpaired devices that are still active (heartbeat within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: devices, error } = await supabase
      .from("devices")
      .select("*")
      .eq("is_paired", false)
      .gte("last_heartbeat", fiveMinutesAgo)
      .order("created_at", { ascending: false })

    if (error) {
      console.log("[v0] Error fetching devices:", error)
      return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 })
    }

    console.log("[v0] Found", devices?.length || 0, "available devices")
    return NextResponse.json({ devices: devices || [] })
  } catch (error) {
    console.log("[v0] Available devices error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] Finding specific device by code")

  try {
    const supabase = await createClient()
    if (!supabase) {
      console.log("[v0] Failed to create Supabase client")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log("[v0] Authentication failed:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { device_code } = await request.json()
    console.log("[v0] Looking for device with code:", device_code)

    if (!device_code) {
      return NextResponse.json({ error: "Device code is required" }, { status: 400 })
    }

    // Find device by code
    const { data: device, error } = await supabase.from("devices").select("*").eq("device_code", device_code).single()

    if (error || !device) {
      console.log("[v0] Device not found:", error)
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Check if device is still active (heartbeat within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const lastHeartbeat = new Date(device.last_heartbeat)

    if (lastHeartbeat < fiveMinutesAgo) {
      console.log("[v0] Device is offline")
      return NextResponse.json({ error: "Device is offline" }, { status: 404 })
    }

    console.log("[v0] Device found and active:", device.id)
    return NextResponse.json({ device })
  } catch (error) {
    console.log("[v0] Find device error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
