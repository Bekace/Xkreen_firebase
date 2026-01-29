import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

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

    // Get user's schedules with item count
    const { data: schedules, error } = await supabase
      .from("schedules")
      .select(`
        *,
        schedule_items(count)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 })
    }

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error("Error listing schedules:", error)
    return NextResponse.json({ error: "Failed to list schedules" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] POST /api/schedules - Starting")
    const supabase = await createClient()

    if (!supabase) {
      console.error("[v0] Failed to create Supabase client")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    console.log("[v0] User:", user?.id)
    console.log("[v0] Auth error:", authError)
    
    if (authError || !user) {
      console.error("[v0] Authentication failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Request body:", body)
    
    const {
      name,
      description,
      is_active = true,
      timezone = "UTC",
    } = body

    if (!name) {
      console.log("[v0] Validation failed: name is required")
      return NextResponse.json({ error: "Schedule name is required" }, { status: 400 })
    }

    console.log("[v0] Creating schedule with:", { user_id: user.id, name, description, is_active, timezone })

    // Create new schedule
    const { data: schedule, error } = await supabase
      .from("schedules")
      .insert({
        user_id: user.id,
        name,
        description,
        is_active,
        timezone,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Database error:", error)
      console.error("[v0] Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json({ error: `Failed to create schedule: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Schedule created successfully:", schedule)
    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("[v0] Error creating schedule:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ 
      error: `Failed to create schedule: ${error instanceof Error ? error.message : "Unknown error"}` 
    }, { status: 500 })
  }
}
