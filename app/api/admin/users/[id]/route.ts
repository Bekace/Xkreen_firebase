import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { createClient } from "@supabase/supabase-js"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireAdmin()
    const { role } = await request.json()
    const userId = params.id

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    if (profile.role === "admin") {
      // Admins can only modify regular users
      const { data: targetUser } = await adminSupabase.from("profiles").select("role").eq("id", userId).single()

      if (targetUser?.role !== "user") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    }

    const { data: updatedUsers, error } = await adminSupabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()

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
    console.error("Admin user update error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireAdmin()
    const userId = params.id

    console.log("[v0] DELETE user request for:", userId, "by admin:", profile.id)

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

    const { error: authDeleteError } = await adminSupabase.rpc("delete_auth_user", { user_id: userId })

    // If RPC doesn't exist, try the admin API
    if (authDeleteError?.message?.includes("function") || authDeleteError?.message?.includes("does not exist")) {
      console.log("[v0] RPC not available, trying admin.deleteUser")
      const { error: adminDeleteError } = await adminSupabase.auth.admin.deleteUser(userId)
      if (adminDeleteError) {
        console.error("[v0] Admin deleteUser also failed:", adminDeleteError)
        // Continue anyway - we'll still soft delete and the middleware will block them
      }
    } else if (authDeleteError) {
      console.error("[v0] RPC delete_auth_user failed:", authDeleteError)
    } else {
      console.log("[v0] Auth user deleted via RPC")
    }

    // Soft delete: set deleted_at timestamp
    const { data: updatedProfile, error: profileError } = await adminSupabase
      .from("profiles")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: profile.id,
      })
      .eq("id", userId)
      .select()
      .single()

    if (profileError) {
      console.error("[v0] Profile soft delete error:", profileError)
      return NextResponse.json({ error: "Failed to soft delete profile: " + profileError.message }, { status: 500 })
    }

    if (!updatedProfile) {
      console.error("[v0] No profile updated for userId:", userId)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Profile soft deleted:", updatedProfile.id, "deleted_at:", updatedProfile.deleted_at)

    await logAdminAction({
      action: "soft_delete_user",
      targetType: "user",
      targetId: userId,
      details: { timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true, deletedAt: updatedProfile.deleted_at })
  } catch (error) {
    console.error("[v0] Admin user deletion error:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
