import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const supabase = await createClient()
    const { itemId } = params

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

    const updates = await request.json()

    // Update schedule item (RLS will check ownership through schedule)
    const { data: item, error } = await supabase
      .from("schedule_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update schedule item" }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error("Error updating schedule item:", error)
    return NextResponse.json({ error: "Failed to update schedule item" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const supabase = await createClient()
    const { itemId } = params

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

    // Delete schedule item (RLS will check ownership through schedule)
    const { error } = await supabase
      .from("schedule_items")
      .delete()
      .eq("id", itemId)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to delete schedule item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting schedule item:", error)
    return NextResponse.json({ error: "Failed to delete schedule item" }, { status: 500 })
  }
}
