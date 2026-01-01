import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params
  const supabase = await createClient()

  // Verify admin access
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!adminProfile || !["admin", "superadmin"].includes(adminProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Get counts
  const [screensResult, mediaResult, playlistsResult] = await Promise.all([
    supabase.from("screens").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("media").select("id, file_size", { count: "exact" }).eq("user_id", userId),
    supabase.from("playlists").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ])

  const storage_bytes = mediaResult.data?.reduce((sum, m) => sum + (m.file_size || 0), 0) || 0

  return NextResponse.json({
    screens: screensResult.count || 0,
    media: mediaResult.count || 0,
    playlists: playlistsResult.count || 0,
    storage_bytes,
  })
}
