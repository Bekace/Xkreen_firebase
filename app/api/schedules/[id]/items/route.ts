import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: scheduleId } = await params

    if (!supabase) {
      console.error("Failed to create Supabase client")
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

    // Verify schedule ownership
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("id")
      .eq("id", scheduleId)
      .eq("user_id", user.id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const {
      content_type,
      content_id,
      start_time,
      end_time,
      recurrence_rule,
      days_of_week,
      priority = 0,
      is_active = true,
    } = await request.json()

    if (!content_type || !content_id) {
      return NextResponse.json(
        { error: "Content type and content ID are required" },
        { status: 400 }
      )
    }

    if (!start_time || !end_time) {
      return NextResponse.json(
        { error: "Start time and end time are required" },
        { status: 400 }
      )
    }

    // Create schedule item
    const { data: item, error } = await supabase
      .from("schedule_items")
      .insert({
        schedule_id: scheduleId,
        content_type,
        content_id,
        start_time,
        end_time,
        recurrence_rule,
        days_of_week,
        priority,
        is_active,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create schedule item" }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error("Error creating schedule item:", error)
    return NextResponse.json({ error: "Failed to create schedule item" }, { status: 500 })
  }
}
