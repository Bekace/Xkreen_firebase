import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get all devices with their last heartbeat
    const { data: devices, error } = await supabase
      .from("devices")
      .select("id, device_code, last_heartbeat, screen_id, screens(name)")
      .order("last_heartbeat", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching devices:", error)
      return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 })
    }

    // Calculate online status (online if heartbeat within last 90 seconds)
    // Since devices send heartbeats every 30 seconds, 90 seconds allows for 2 missed heartbeats
    const now = new Date()
    const ninetySecondsAgo = new Date(now.getTime() - 90 * 1000)

    const devicesWithStatus = devices.map((device) => {
      const lastHeartbeat = device.last_heartbeat ? new Date(device.last_heartbeat) : null
      const isOnline = lastHeartbeat && lastHeartbeat > ninetySecondsAgo

      return {
        ...device,
        is_online: isOnline,
        last_seen: device.last_heartbeat,
      }
    })

    const onlineCount = devicesWithStatus.filter((d) => d.is_online).length
    const offlineCount = devicesWithStatus.length - onlineCount

    return NextResponse.json({
      devices: devicesWithStatus,
      summary: {
        total: devicesWithStatus.length,
        online: onlineCount,
        offline: offlineCount,
      },
    })
  } catch (error) {
    console.error("[v0] Device status API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
