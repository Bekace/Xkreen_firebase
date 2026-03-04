import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET schedule with items - params is synchronous object
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get schedule with items (no relationship joins due to polymorphic content_type)
    const { data: schedule, error } = await supabase
      .from("schedules")
      .select(`
        *,
        schedule_items(*)
      `)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Database error fetching schedule:", error)
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 })
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

    console.log("[v0] PATCH /api/schedules/[id] - params.id:", params.id)
    console.log("[v0] PATCH /api/schedules/[id] - user.id:", user.id)
    console.log("[v0] PATCH /api/schedules/[id] - updates:", JSON.stringify(updates))

    // Update schedule
    const { data: schedule, error } = await supabase
      .from("schedules")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    console.log("[v0] PATCH /api/schedules/[id] - result:", JSON.stringify({ schedule, error }))

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
