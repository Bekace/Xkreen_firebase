import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { createClient } from "@supabase/supabase-js"
import { deleteFromGCS } from "@/lib/gcs/rest-client"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { profile } = await requireAdmin()
    const userId = params.id

    // Only superadmins can permanently delete users
    if (profile.role !== "superadmin") {
      return NextResponse.json({ error: "Only superadmins can permanently delete users" }, { status: 403 })
    }

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Verify user exists and is soft-deleted
    const { data: targetUser } = await adminSupabase
      .from("profiles")
      .select("id, email, deleted_at")
      .eq("id", userId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!targetUser.deleted_at) {
      return NextResponse.json({ error: "User must be soft-deleted first" }, { status: 400 })
    }

    // 1. Get all media files to delete from GCS
    const { data: mediaFiles } = await adminSupabase
      .from("media")
      .select("id, file_path, mime_type")
      .eq("user_id", userId)

    // 2. Delete from GCS storage
    if (mediaFiles && mediaFiles.length > 0) {
      const bucketName = process.env.GCS_BUCKET_NAME || "xkreen-web-app"

      for (const media of mediaFiles) {
        // Skip external media (YouTube, Google Slides)
        const isExternal =
          media.mime_type === "video/youtube" ||
          media.mime_type === "application/vnd.google-apps.presentation" ||
          media.file_path.includes("youtube.com") ||
          media.file_path.includes("docs.google.com")

        if (!isExternal && media.file_path) {
          try {
            // Extract filename from GCS URL: https://storage.googleapis.com/bucket/filename
            const url = new URL(media.file_path)
            const filename = url.pathname.split("/").slice(2).join("/")
            await deleteFromGCS(bucketName, filename)
          } catch (e) {
            console.error("Failed to delete from GCS:", media.file_path, e)
          }
        }
      }
    }

    // 3. Delete playlist_items (references playlists and media)
    const { data: playlists } = await adminSupabase.from("playlists").select("id").eq("user_id", userId)

    if (playlists && playlists.length > 0) {
      const playlistIds = playlists.map((p) => p.id)
      await adminSupabase.from("playlist_items").delete().in("playlist_id", playlistIds)
    }

    // 4. Delete screen_playlists (references screens)
    const { data: screens } = await adminSupabase.from("screens").select("id").eq("user_id", userId)

    if (screens && screens.length > 0) {
      const screenIds = screens.map((s) => s.id)
      await adminSupabase.from("screen_playlists").delete().in("screen_id", screenIds)
    }

    // 5. Delete in order respecting foreign keys
    await adminSupabase.from("api_tokens").delete().eq("user_id", userId)
    await adminSupabase.from("analytics").delete().eq("user_id", userId)
    await adminSupabase.from("devices").delete().eq("user_id", userId)
    await adminSupabase.from("screens").delete().eq("user_id", userId)
    await adminSupabase.from("playlists").delete().eq("user_id", userId)
    await adminSupabase.from("media").delete().eq("user_id", userId)
    await adminSupabase.from("user_subscriptions").delete().eq("user_id", userId)

    // 6. Finally delete the profile
    const { error: profileError } = await adminSupabase.from("profiles").delete().eq("id", userId)

    if (profileError) {
      console.error("Failed to delete profile:", profileError)
      return NextResponse.json({ error: "Failed to delete user profile" }, { status: 500 })
    }

    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Failed to delete auth user:", authError)
      // Profile is already deleted, so log but don't fail
    }

    await logAdminAction({
      action: "permanent_delete_user",
      targetType: "user",
      targetId: userId,
      details: {
        deleted_by: profile.id,
        email: targetUser.email,
        timestamp: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Permanent delete error:", error)
    return NextResponse.json({ error: "Failed to permanently delete user" }, { status: 500 })
  }
}
