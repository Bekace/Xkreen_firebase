import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id: scheduleId } = params

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
      start_date,
      end_date,
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

    // Determine recurrence_type from recurrence_rule
    let recurrence_type = "once"
    if (recurrence_rule) {
      if (recurrence_rule.includes("FREQ=DAILY")) {
        recurrence_type = "daily"
      } else if (recurrence_rule.includes("FREQ=WEEKLY")) {
        recurrence_type = "weekly"
      } else if (recurrence_rule.includes("FREQ=MONTHLY")) {
        recurrence_type = "monthly"
      } else {
        recurrence_type = "custom"
      }
    }

    // Use provided start_date or default to today
    const itemStartDate = start_date || new Date().toISOString().split("T")[0]

    // Create schedule item
    const { data: item, error } = await supabase
      .from("schedule_items")
      .insert({
        schedule_id: scheduleId,
        content_type,
        content_id,
        start_time,
        end_time,
        recurrence_type,
        recurrence_rule,
        days_of_week,
        priority,
        start_date: itemStartDate,
        end_date: end_date || null,
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
