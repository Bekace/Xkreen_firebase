import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/devices/heartbeat
 * 
 * Android devices send heartbeat every 30 seconds to indicate they're online.
 * Updates the last_heartbeat timestamp in the devices table.
 * 
 * Request body:
 * {
 *   "device_code": "ABC123",
 *   "device_info": {
 *     "app_version": "1.0.0",
 *     "os_version": "Android 12",
 *     "battery_level": 85,
 *     "storage_available": 1024000000
 *   }
 * }
 */
export async function POST(request: NextRequest) {
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

    console.log("[v0] Heartbeat received from device:", device_code)

    // Update last_heartbeat and optionally device_info
    const updateData: any = {
      last_heartbeat: new Date().toISOString(),
    }

    if (device_info) {
      updateData.device_info = device_info
    }

    const { data: device, error } = await supabase
      .from("devices")
      .update(updateData)
      .eq("device_code", device_code)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating heartbeat:", error)
      return NextResponse.json(
        { error: "Failed to update heartbeat", details: error.message },
        { status: 500 }
      )
    }

    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      )
    }

    console.log("[v0] Heartbeat updated successfully for device:", device_code)

    return NextResponse.json({
      success: true,
      last_heartbeat: device.last_heartbeat,
      message: "Heartbeat recorded successfully"
    })

  } catch (error: any) {
    console.error("[v0] Error in heartbeat endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
