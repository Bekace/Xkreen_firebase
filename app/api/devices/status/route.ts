import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Corrected Query:
    // 1. Select from the 'devices' table.
    // 2. Use '!inner' to create an inner join with 'screens'. This ensures that only devices
    //    that are actually paired with a screen are returned.
    // 3. Filter the results where the 'user_id' on the joined 'screens' table matches the
    //    currently authenticated user's ID.
    const { data: devices, error } = await supabase
      .from("devices")
      .select("id, device_code, last_heartbeat, screen_id, screens!inner(name, user_id, is_active)")
      .eq("screens.user_id", user.id)
      .eq("screens.is_active", true)
      .eq("is_paired", true)
      .order("last_heartbeat", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching devices:", error)
      return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 })
    }

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
