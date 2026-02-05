import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/devices/events
 * 
 * Android devices send playback events for proof of play tracking.
 * Events include media_start, media_end, and media_error.
 * 
 * Request body:
 * {
 *   "device_code": "ABC123",
 *   "event_type": "media_start",
 *   "media_id": "uuid",
 *   "playlist_id": "uuid",
 *   "metadata": {
 *     "duration": 30000,
 *     "position": 0,
 *     "timestamp": "2024-01-15T10:30:00Z"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { device_code, event_type, media_id, playlist_id, metadata } = body

    // Validate required fields
    if (!device_code) {
      return NextResponse.json(
        { error: "device_code is required" },
        { status: 400 }
      )
    }

    if (!event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 }
      )
    }

    // Validate event_type
    const validEventTypes = ["media_start", "media_end", "media_error"]
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `event_type must be one of: ${validEventTypes.join(", ")}` },
        { status: 400 }
      )
    }

    console.log("[v0] Event received:", { device_code, event_type, media_id })

    // Get device by device_code
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id")
      .eq("device_code", device_code)
      .single()

    if (deviceError || !device) {
      console.error("[v0] Device not found:", device_code)
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      )
    }

    // Insert event into device_events table
    const { data: event, error: eventError } = await supabase
      .from("device_events")
      .insert({
        device_id: device.id,
        event_type,
        media_id: media_id || null,
        playlist_id: playlist_id || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (eventError) {
      console.error("[v0] Error inserting event:", eventError)
      return NextResponse.json(
        { error: "Failed to record event", details: eventError.message },
        { status: 500 }
      )
    }

    console.log("[v0] Event recorded successfully:", event.id)

    return NextResponse.json({
      success: true,
      event_id: event.id,
      message: "Event recorded successfully"
    })

  } catch (error: any) {
    console.error("[v0] Error in events endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/devices/events?device_code=ABC123&limit=100
 * 
 * Retrieve events for a specific device (for dashboard/analytics)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const device_code = searchParams.get("device_code")
    const limit = parseInt(searchParams.get("limit") || "100")
    const event_type = searchParams.get("event_type")

    if (!device_code) {
      return NextResponse.json(
        { error: "device_code is required" },
        { status: 400 }
      )
    }

    // Get device by device_code
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id")
      .eq("device_code", device_code)
      .single()

    if (deviceError || !device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      )
    }

    // Build query
    let query = supabase
      .from("device_events")
      .select(`
        id,
        event_type,
        media_id,
        playlist_id,
        metadata,
        created_at,
        media (
          id,
          name,
          file_path,
          mime_type
        )
      `)
      .eq("device_id", device.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    // Filter by event type if provided
    if (event_type) {
      query = query.eq("event_type", event_type)
    }

    const { data: events, error: eventsError } = await query

    if (eventsError) {
      console.error("[v0] Error fetching events:", eventsError)
      return NextResponse.json(
        { error: "Failed to fetch events", details: eventsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0
    })

  } catch (error: any) {
    console.error("[v0] Error in GET events endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
