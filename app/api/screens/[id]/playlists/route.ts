import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { playlist_id, is_active } = await request.json()

    if (!playlist_id) {
      return NextResponse.json({ error: "playlist_id is required" }, { status: 400 })
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from("screen_playlists")
      .select("id")
      .eq("screen_id", params.id)
      .eq("playlist_id", playlist_id)
      .single()

    if (existingAssignment) {
      // Update existing assignment
      const { error: updateError } = await supabase
        .from("screen_playlists")
        .update({ is_active: is_active ?? true })
        .eq("id", existingAssignment.id)

      if (updateError) {
        console.error("Error updating playlist assignment:", updateError)
        return NextResponse.json({ error: "Failed to update playlist assignment" }, { status: 500 })
      }
    } else {
      // Create new assignment
      const { error: insertError } = await supabase.from("screen_playlists").insert({
        screen_id: params.id,
        playlist_id: playlist_id,
        is_active: is_active ?? true,
      })

      if (insertError) {
        console.error("Error creating playlist assignment:", insertError)
        return NextResponse.json({ error: "Failed to assign playlist" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error managing playlist assignment:", error)
    return NextResponse.json({ error: "Failed to manage playlist assignment" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { playlist_id } = await request.json()

    if (!playlist_id) {
      return NextResponse.json({ error: "playlist_id is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("screen_playlists")
      .delete()
      .eq("screen_id", params.id)
      .eq("playlist_id", playlist_id)

    if (error) {
      console.error("Error removing playlist assignment:", error)
      return NextResponse.json({ error: "Failed to remove playlist assignment" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing playlist assignment:", error)
    return NextResponse.json({ error: "Failed to remove playlist assignment" }, { status: 500 })
  }
}
