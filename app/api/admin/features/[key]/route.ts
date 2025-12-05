import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function PATCH(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const { feature_name, description } = await request.json()
    const featureKey = params.key

    const { data: updatedPermissions, error } = await supabase
      .from("feature_permissions")
      .update({ feature_name })
      .eq("feature_key", featureKey)
      .select()

    if (error) throw error

    await logAdminAction({
      action: "update_feature",
      targetType: "feature",
      targetId: featureKey,
      details: { feature_name },
    })

    return NextResponse.json({ permissions: updatedPermissions })
  } catch (error) {
    console.error("[v0] Admin feature update error:", error)
    return NextResponse.json({ error: "Failed to update feature" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const featureKey = params.key

    const { error } = await supabase.from("feature_permissions").delete().eq("feature_key", featureKey)

    if (error) throw error

    await logAdminAction({
      action: "delete_feature",
      targetType: "feature",
      targetId: featureKey,
      details: { timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin feature deletion error:", error)
    return NextResponse.json({ error: "Failed to delete feature" }, { status: 500 })
  }
}
