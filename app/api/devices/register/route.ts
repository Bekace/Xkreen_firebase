import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[v0] Device registration request received")

  try {
    const supabase = await createClient()
    if (!supabase) {
      console.log("[v0] Failed to create Supabase client")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { device_code, device_info } = await request.json()
    console.log("[v0] Registering device with code:", device_code)

    if (!device_code) {
      return NextResponse.json({ error: "Device code is required" }, { status: 400 })
    }

    // Check if device already exists
    const { data: existingDevice } = await supabase.from("devices").select("*").eq("device_code", device_code).single()

    if (existingDevice) {
      console.log("[v0] Device already exists, updating heartbeat")
      // Update existing device heartbeat
      const { data: updatedDevice, error: updateError } = await supabase
        .from("devices")
        .update({
          last_heartbeat: new Date().toISOString(),
          device_info: device_info || existingDevice.device_info,
        })
        .eq("device_code", device_code)
        .select()
        .single()

      if (updateError) {
        console.log("[v0] Error updating device:", updateError)
        return NextResponse.json({ error: "Failed to update device" }, { status: 500 })
      }

      return NextResponse.json({ device: updatedDevice })
    }

    // Create new device
    console.log("[v0] Attempting to create new device with data:", {
      device_code,
      device_info: device_info || {},
      is_paired: false,
      last_heartbeat: new Date().toISOString(),
    })

    const { data: newDevice, error: insertError } = await supabase
      .from("devices")
      .insert({
        device_code,
        device_info: device_info || {},
        is_paired: false,
        last_heartbeat: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.log("[v0] Error creating device - Full error details:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      })
      return NextResponse.json(
        {
          error: "Failed to create device",
          details: insertError.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Device registered successfully:", newDevice.id)
    return NextResponse.json({ device: newDevice })
  } catch (error) {
    console.log("[v0] Device registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
