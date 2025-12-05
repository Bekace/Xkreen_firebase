import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { createClient } from "@supabase/supabase-js"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireAdmin()
    const { role } = await request.json()
    const userId = params.id

    console.log("[v0] Updating user ID:", userId, "with role:", role)

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    if (profile.role === "admin") {
      // Admins can only modify regular users
      const { data: targetUser } = await adminSupabase.from("profiles").select("role").eq("id", userId).single()

      if (targetUser?.role !== "user") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    }
    // Superadmins can update any user (no additional checks needed)

    const { data: updatedUsers, error } = await adminSupabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()

    console.log("[v0] Update result:", { updatedUsers, error })

    if (error) throw error

    if (!updatedUsers || updatedUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updatedUser = updatedUsers[0]

    await logAdminAction({
      action: "update_user_role",
      targetType: "user",
      targetId: userId,
      details: { newRole: role },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("[v0] Admin user update error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireAdmin()
    const userId = params.id

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Check permissions
    if (profile.role === "admin") {
      // Admins can only delete regular users
      const { data: targetUser } = await adminSupabase.from("profiles").select("role").eq("id", userId).single()

      if (targetUser?.role !== "user") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    }

    // Prevent superadmins from deleting other superadmins
    if (profile.role === "superadmin") {
      const { data: targetUser } = await adminSupabase.from("profiles").select("role").eq("id", userId).single()

      if (targetUser?.role === "superadmin") {
        return NextResponse.json({ error: "Cannot delete other super admins" }, { status: 403 })
      }
    }

    const { error } = await adminSupabase.from("profiles").delete().eq("id", userId)

    if (error) throw error

    await logAdminAction({
      action: "delete_user",
      targetType: "user",
      targetId: userId,
      details: { timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin user deletion error:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
