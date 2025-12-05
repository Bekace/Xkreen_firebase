import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdmin()

    // Get all feature permissions with plan details
    const { data: permissions, error } = await supabase
      .from("feature_permissions")
      .select(`
        *,
        subscription_plans(id, name)
      `)
      .order("feature_key")

    if (error) throw error

    // Group permissions by feature
    const featuresMap = new Map<string, any>()

    permissions.forEach((permission: any) => {
      const featureKey = permission.feature_key

      if (!featuresMap.has(featureKey)) {
        featuresMap.set(featureKey, {
          feature_key: featureKey,
          feature_name: permission.feature_name,
          description: null, // Could be added to schema later
          permissions: [],
        })
      }

      featuresMap.get(featureKey).permissions.push({
        id: permission.id,
        plan_id: permission.plan_id,
        plan_name: permission.subscription_plans.name,
        feature_key: permission.feature_key,
        feature_name: permission.feature_name,
        is_enabled: permission.is_enabled,
        limit_value: permission.limit_value,
        created_at: permission.created_at,
      })
    })

    const features = Array.from(featuresMap.values())

    await logAdminAction({
      action: "view_features",
      targetType: "feature",
      details: { count: features.length },
    })

    return NextResponse.json({ features })
  } catch (error) {
    console.error("[v0] Admin features fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch features" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdmin()
    const { feature_key, feature_name, description } = await request.json()

    if (!feature_key || !feature_name) {
      return NextResponse.json({ error: "Feature key and name are required" }, { status: 400 })
    }

    // Get all subscription plans
    const { data: plans, error: plansError } = await supabase.from("subscription_plans").select("id")

    if (plansError) throw plansError

    // Create feature permissions for all plans (disabled by default)
    const permissions = plans.map((plan: any) => ({
      plan_id: plan.id,
      feature_key,
      feature_name,
      is_enabled: false,
    }))

    const { data: newPermissions, error } = await supabase.from("feature_permissions").insert(permissions).select()

    if (error) throw error

    await logAdminAction({
      action: "create_feature",
      targetType: "feature",
      targetId: feature_key,
      details: { feature_name, plans_count: plans.length },
    })

    return NextResponse.json({ permissions: newPermissions })
  } catch (error) {
    console.error("[v0] Admin feature creation error:", error)
    return NextResponse.json({ error: "Failed to create feature" }, { status: 500 })
  }
}
