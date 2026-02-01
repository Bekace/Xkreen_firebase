import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET schedule with items - params is synchronous object
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const scheduleId = params.id
    
    console.log("[v0 API] GET /api/schedules/[id] - Schedule ID:", scheduleId)

    if (!supabase) {
      console.error("[v0 API] Supabase client creation failed")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    console.log("[v0 API] User authenticated:", user?.id)
    
    if (authError || !user) {
      console.error("[v0 API] Authentication failed:", authError?.message)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get schedule with items
    const { data: schedule, error } = await supabase
      .from("schedules")
      .select(`
        *,
        schedule_items(
          *,
          playlists(id, name),
          media(id, name, type, url)
        )
      `)
      .eq("id", scheduleId)
      .eq("user_id", user.id)
      .single()

    console.log("[v0 API] Query completed - Error:", error?.message, "Schedule found:", !!schedule)
    console.log("[v0 API] Schedule items count:", schedule?.schedule_items?.length || 0)

    if (error) {
      console.error("[v0 API] Database error fetching schedule:", error)
      return NextResponse.json({ error: "Schedule not found", details: error.message }, { status: 404 })
    }

    console.log("[v0 API] Returning schedule with", schedule.schedule_items?.length || 0, "items")
    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("[v0 API] Exception in GET:", error)
    return NextResponse.json({ 
      error: "Failed to fetch schedule",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updates = await request.json()

    // Update schedule
    const { data: schedule, error } = await supabase
      .from("schedules")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error updating schedule:", error)
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete schedule (cascade will handle items)
    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 })
  }
}
