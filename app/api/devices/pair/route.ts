import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { deviceCode, screenId } = await request.json()

    if (!deviceCode || !screenId) {
      return NextResponse.json({ error: "Device code and screen ID are required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile) {
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        full_name: user.email,
      })
    }

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .single()

    if (deviceError || !device) {
      return NextResponse.json({ error: "Device not found or belongs to another user" }, { status: 404 })
    }

    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("id, name, orientation")
      .eq("id", screenId)
      .eq("user_id", user.id)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Invalid screen ID" }, { status: 404 })
    }

    const { data: updatedDevice, error: updateError } = await supabase
      .from("devices")
      .update({
        is_paired: true,
        screen_id: screenId,
        user_id: user.id,
        last_heartbeat: new Date().toISOString(),
      })
      .eq("id", device.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to pair device",
          details: updateError.message,
        },
        { status: 500 },
      )
    }

    await supabase
      .from("screens")
      .update({
        status: "online",
        last_seen: new Date().toISOString(),
      })
      .eq("id", screenId)

    return NextResponse.json({
      success: true,
      screen: {
        id: screen.id,
        name: screen.name,
        orientation: screen.orientation,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
