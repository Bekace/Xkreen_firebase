import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { screenCode: string } }) {
  try {
    const { screenCode } = params

    console.log("[v0] === SCREEN HEARTBEAT START ===")
    console.log("[v0] Screen heartbeat:", { screenCode, timestamp: new Date().toISOString() })

    if (!screenCode) {
      return NextResponse.json({ error: "Screen code is required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Update screen last_seen and status
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .update({
        last_seen: new Date().toISOString(),
        status: "online",
      })
      .eq("screen_code", screenCode)
      .select("id, name")
      .single()

    if (screenError || !screen) {
      console.log("[v0] Screen not found for heartbeat:", screenError)
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    console.log("[v0] Screen heartbeat updated successfully:", screen.name)
    console.log("[v0] === SCREEN HEARTBEAT END ===")

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Screen heartbeat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
