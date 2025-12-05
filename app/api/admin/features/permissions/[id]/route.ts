import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const { is_enabled, limit_value } = await request.json()
    const permissionId = params.id

    const { data: updatedPermission, error } = await supabase
      .from("feature_permissions")
      .update({ is_enabled, limit_value })
      .eq("id", permissionId)
      .select(`
        *,
        subscription_plans(name)
      `)
      .single()

    if (error) throw error

    await logAdminAction({
      action: "toggle_feature_permission",
      targetType: "feature_permission",
      targetId: permissionId,
      details: {
        feature_key: updatedPermission.feature_key,
        plan_name: updatedPermission.subscription_plans.name,
        is_enabled,
      },
    })

    return NextResponse.json({ permission: updatedPermission })
  } catch (error) {
    console.error("[v0] Admin feature permission update error:", error)
    return NextResponse.json({ error: "Failed to update feature permission" }, { status: 500 })
  }
}
