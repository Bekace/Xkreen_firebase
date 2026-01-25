import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { screen_ids } = await request.json()

    if (!screen_ids || !Array.isArray(screen_ids)) {
      return NextResponse.json({ error: "screen_ids array is required" }, { status: 400 })
    }

    // Verify location belongs to user
    const { data: location } = await supabase
      .from("locations")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    // Insert screen assignments
    const assignments = screen_ids.map((screen_id) => ({
      location_id: params.id,
      screen_id,
    }))

    const { data, error } = await supabase.from("screen_locations").insert(assignments).select()

    if (error) {
      console.error("Error assigning screens:", error)
      return NextResponse.json({ error: "Failed to assign screens" }, { status: 500 })
    }

    return NextResponse.json({ assignments: data })
  } catch (error) {
    console.error("Error in screen assignment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { screen_id } = await request.json()

    if (!screen_id) {
      return NextResponse.json({ error: "screen_id is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("screen_locations")
      .delete()
      .eq("location_id", params.id)
      .eq("screen_id", screen_id)

    if (error) {
      console.error("Error removing screen from location:", error)
      return NextResponse.json({ error: "Failed to remove screen" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in screen removal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
