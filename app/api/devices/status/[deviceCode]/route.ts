import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id, device_code, is_paired, screen_id, user_id, last_heartbeat")
      .eq("device_code", params.deviceCode)
      .order("updated_at", { ascending: false })
      .single()

    if (deviceError || !device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    await supabase.from("devices").update({ last_heartbeat: new Date().toISOString() }).eq("id", device.id)

    return NextResponse.json(
      {
        device: {
          id: device.id,
          device_code: device.device_code,
          is_paired: device.is_paired,
          screen_id: device.screen_id,
          last_heartbeat: device.last_heartbeat,
        },
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
