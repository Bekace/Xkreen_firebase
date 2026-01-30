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

    const {
      name,
      description,
      is_active = true,
    } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Schedule name is required" }, { status: 400 })
    }

    // Create new schedule
    const { data: schedule, error } = await supabase
      .from("schedules")
      .insert({
        user_id: user.id,
        name,
        description,
        is_active,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error creating schedule:", error)
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 })
  }
}
