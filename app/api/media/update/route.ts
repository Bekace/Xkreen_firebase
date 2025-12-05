import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { id, name, tags } = body

    if (!id) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 })
    }

    // Prepare update data
    const updateData: { name?: string; tags?: string[]; updated_at: string } = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      updateData.name = name
    }

    if (tags !== undefined) {
      updateData.tags = tags
    }

    // Update media in database
    const { data: media, error: updateError } = await supabase
      .from("media")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating media:", updateError)
      return NextResponse.json({ error: "Failed to update media" }, { status: 500 })
    }

    return NextResponse.json({ media })
  } catch (error) {
    console.error("Error in media update:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
