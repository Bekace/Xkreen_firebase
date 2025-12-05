import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] API /media/list - Creating Supabase client...")
    const supabase = await createClient()

    if (!supabase) {
      console.error("[v0] API /media/list - Failed to create Supabase client")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    console.log("[v0] API /media/list - Checking authentication...")
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] API /media/list - Auth error:", authError?.message || "No user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] API /media/list - Fetching media for user:", user.id)
    // Get user's media from database
    const { data: media, error } = await supabase
      .from("media")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] API /media/list - Database error:", error)
      return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 })
    }

    console.log("[v0] API /media/list - Success, returning", media?.length || 0, "items")
    return NextResponse.json({ media: media || [] })
  } catch (error) {
    console.error("[v0] API /media/list - Unexpected error:", error)
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 })
  }
}
