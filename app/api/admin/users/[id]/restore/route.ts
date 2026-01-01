import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { createClient } from "@supabase/supabase-js"

// Restore a soft-deleted user
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireAdmin()
    const userId = params.id

    // Only superadmins can restore users
    if (profile.role !== "superadmin") {
      return NextResponse.json({ error: "Only super admins can restore users" }, { status: 403 })
    }

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Clear deleted_at and deleted_by to restore the user
    const { data: restoredUser, error } = await adminSupabase
      .from("profiles")
      .update({
        deleted_at: null,
        deleted_by: null,
      })
      .eq("id", userId)
      .select()
      .single()

    if (error) throw error

    await logAdminAction({
      action: "restore_user",
      targetType: "user",
      targetId: userId,
      details: { restored_by: profile.id, timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true, user: restoredUser })
  } catch (error) {
    console.error("Admin user restore error:", error)
    return NextResponse.json({ error: "Failed to restore user" }, { status: 500 })
  }
}
