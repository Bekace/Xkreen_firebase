import { del } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "No media ID provided" }, { status: 400 })
    }

    // Get media record to verify ownership and get blob URL
    const { data: media, error: fetchError } = await supabase
      .from("media")
      .select("file_path") // using correct column name instead of blob_url
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    // Delete from Vercel Blob
    await del(media.file_path) // using file_path instead of blob_url

    // Delete from database
    const { error: deleteError } = await supabase.from("media").delete().eq("id", id).eq("user_id", user.id)

    if (deleteError) {
      console.error("Database delete error:", deleteError)
      return NextResponse.json({ error: "Failed to delete media record" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
