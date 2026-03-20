import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/devices/heartbeat
 * 
 * All player clients send a heartbeat every 30 seconds to indicate they're online.
 * This endpoint updates the last_heartbeat timestamp and optionally other device info.
 * 
 * Request body:
 * {
 *   "device_code": "ABC123",
 *   "device_info": { ... } // Optional
 * }
 */
export async function POST(request: NextRequest) {
  // EMERGENCY STOP: This endpoint is temporarily disabled to prevent database saturation.
  return NextResponse.json({ message: "Heartbeat processing is temporarily disabled by the assistant." });

  try {
    const supabase = await createClient()
    const body = await request.json()

    const { device_code, device_info } = body

    if (!device_code) {
      return NextResponse.json(
        { error: "device_code is required" },
        { status: 400 }
      )
    }

    // Update the device's last_heartbeat timestamp
    const { data, error } = await supabase
      .from("devices")
      .update({ 
        last_heartbeat: new Date().toISOString(),
        ...device_info // Spread optional device info if provided
      })
      .eq("code", device_code)
      .select("id")
      .single()

    if (error) {
      console.error("[HEARTBEAT] Error updating device:", error)
      return NextResponse.json(
        { error: "Device not found or failed to update" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Heartbeat received",
      device_id: data.id,
    })
  } catch (error) {
    console.error("[HEARTBEAT] Internal server error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
