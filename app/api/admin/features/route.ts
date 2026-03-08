import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

// Derive a human-readable name from a snake_case feature key
function toFeatureName(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdmin()

    const { data: permissions, error } = await supabase
      .from("feature_permissions")
      .select(`*, subscription_plans(id, name)`)
      .order("feature_key")

    if (error) throw error

    // Group permissions by feature_key, deriving a display name from the key
    const featuresMap = new Map<string, any>()

    permissions.forEach((permission: any) => {
      const featureKey = permission.feature_key
      const derivedName = toFeatureName(featureKey)

      if (!featuresMap.has(featureKey)) {
        featuresMap.set(featureKey, {
          feature_key: featureKey,
          feature_name: derivedName,
          description: null,
          permissions: [],
        })
      }

      featuresMap.get(featureKey).permissions.push({
        id: permission.id,
        plan_id: permission.plan_id,
        plan_name: permission.subscription_plans.name,
        feature_key: permission.feature_key,
        feature_name: derivedName,
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
    const { feature_key, plan_enabled_ids } = await request.json()

    if (!feature_key) {
      return NextResponse.json({ error: "Feature key is required" }, { status: 400 })
    }

    const { data: plans, error: plansError } = await supabase.from("subscription_plans").select("id")
    if (plansError) throw plansError

    // Create feature_permissions for all plans; enable only those in plan_enabled_ids
    const enabledSet = new Set<string>(plan_enabled_ids || [])
    const permissions = plans.map((plan: any) => ({
      plan_id: plan.id,
      feature_key,
      is_enabled: enabledSet.has(plan.id),
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
