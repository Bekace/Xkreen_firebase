import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ screenId: string }> }) {
  try {
    const supabase = await createClient()
    const { screenId } = await params
    const body = await request.json()
    const { schedule_id, is_active = true } = body

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify screen belongs to user
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("id")
      .eq("id", screenId)
      .eq("user_id", user.id)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    // Check if schedule assignment already exists
    const { data: existing } = await supabase
      .from("screen_schedules")
      .select("id")
      .eq("screen_id", screenId)
      .eq("schedule_id", schedule_id)
      .single()

    if (existing) {
      // Update existing assignment
      const { error: updateError } = await supabase
        .from("screen_schedules")
        .update({ is_active })
        .eq("id", existing.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // Create new assignment
    const { error: insertError } = await supabase.from("screen_schedules").insert({
      screen_id: screenId,
      schedule_id: schedule_id,
      is_active,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error assigning schedule to screen:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ screenId: string }> }) {
  try {
    const supabase = await createClient()
    const { screenId } = await params

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get schedules for this screen
    const { data, error } = await supabase
      .from("screen_schedules")
      .select("*, schedules(*)")
      .eq("screen_id", screenId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error fetching screen schedules:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ screenId: string }> }) {
  try {
    const supabase = await createClient()
    const { screenId } = await params
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get("schedule_id")

    if (!scheduleId) {
      return NextResponse.json({ error: "schedule_id is required" }, { status: 400 })
    }

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete the assignment
    const { error } = await supabase
      .from("screen_schedules")
      .delete()
      .eq("screen_id", screenId)
      .eq("schedule_id", scheduleId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error removing schedule from screen:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
