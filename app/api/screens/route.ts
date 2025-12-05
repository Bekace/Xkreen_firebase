import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: screens, error } = await supabase
      .from("screens")
      .select(`
        *,
        screen_playlists(
          playlist_id,
          is_active,
          playlists(id, name)
        ),
        screen_media(
          media_id,
          media(id, name, mime_type, file_path)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch screens" }, { status: 500 })
    }

    return NextResponse.json({ screens })
  } catch (error) {
    console.error("Error listing screens:", error)
    return NextResponse.json({ error: "Failed to list screens" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, location, resolution, orientation, content_type } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Screen name is required" }, { status: 400 })
    }

    // Generate unique screen code
    const screenCode = `SCR-${Date.now().toString(36).toUpperCase()}`

    // Create new screen
    const { data: screen, error } = await supabase
      .from("screens")
      .insert({
        user_id: user.id,
        name,
        location,
        resolution,
        orientation,
        screen_code: screenCode,
        status: "offline",
        content_type: content_type || "none",
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create screen" }, { status: 500 })
    }

    return NextResponse.json({ screen })
  } catch (error) {
    console.error("Error creating screen:", error)
    return NextResponse.json({ error: "Failed to create screen" }, { status: 500 })
  }
}
