import { del } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

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

    const { data: media, error: fetchError } = await supabase
      .from("media")
      .select("file_path, mime_type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    const isExternalMedia =
      media.mime_type === "video/youtube" ||
      media.mime_type === "application/vnd.google-apps.presentation" ||
      media.file_path.includes("youtube.com") ||
      media.file_path.includes("youtube-nocookie.com") ||
      media.file_path.includes("docs.google.com")

    if (!isExternalMedia) {
      // Only delete from blob storage if it's an actual blob URL
      try {
        await del(media.file_path)
      } catch (blobError) {
        console.error("Blob delete error (non-critical):", blobError)
        // Continue with database deletion even if blob deletion fails
      }
    }

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
