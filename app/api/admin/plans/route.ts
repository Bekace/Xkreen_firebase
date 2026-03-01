import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdminAPI } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSuperAdminAPI()
    if ("error" in authResult && authResult.error !== null) {
      return authResult
    }
    const { supabase } = authResult

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select(`
        *,
        subscription_prices (
          id,
          plan_id,
          billing_cycle,
          price,
          stripe_price_id,
          trial_days,
          is_active
        ),
        feature_permissions (
          feature_key,
          is_enabled
        ),
        user_subscriptions(count)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    const formattedPlans = plans.map((plan: any) => {
      const prices = plan.subscription_prices || []
      const monthlyPrice = prices.find((p: any) => p.billing_cycle === "monthly")?.price || 0
      const yearlyPrice = prices.find((p: any) => p.billing_cycle === "yearly")?.price || 0

      return {
        ...plan,
        prices,
        monthly_price: monthlyPrice,
        yearly_price: yearlyPrice,
        subscriber_count: plan.user_subscriptions?.filter((sub: any) => sub.count > 0).length || 0,
      }
    })

    try {
      await logAdminAction({
        action: "view_subscription_plans",
        targetType: "plan",
        details: { count: plans.length },
      })
    } catch (_) {}

    return NextResponse.json({ plans: formattedPlans })
  } catch (error) {
    console.error("Admin plans fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch subscription plans" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSuperAdminAPI()
    if ("error" in authResult && authResult.error !== null) {
      return authResult
    }
    const { supabase } = authResult

    const body = await request.json()

    const { monthly_price, yearly_price, trial_days, features, ...planData } = body

    // Create the plan first
    const { data: newPlan, error: planError } = await supabase
      .from("subscription_plans")
      .insert({
        name: planData.name,
        description: planData.description,
        max_screens: planData.max_screens,
        free_screens: planData.free_screens ?? 0,
        max_media_storage: planData.max_media_storage,
        max_file_upload_size: planData.max_file_upload_size,
        storage_unit: planData.storage_unit,
        max_playlists: planData.max_playlists,
        max_locations: planData.max_locations ?? 1,
        max_schedules: planData.max_schedules ?? 1,
        max_team_members: planData.max_team_members ?? 0,
        is_active: planData.is_active,
        display_branding: planData.display_branding,
      })
      .select()
      .single()

    if (planError) throw planError

    // Save feature permissions
    if (features) {
      const featurePermissions = Object.entries(features).map(([key, enabled]) => ({
        plan_id: newPlan.id,
        feature_key: key,
        is_enabled: enabled as boolean,
      }))

      const { error: featuresError } = await supabase
        .from("feature_permissions")
        .insert(featurePermissions)

      if (featuresError) {
        console.error("[v0] Error saving feature permissions:", featuresError)
      }
    }

    const pricesToInsert = []

    if (monthly_price !== undefined) {
      pricesToInsert.push({
        plan_id: newPlan.id,
        billing_cycle: "monthly",
        price: monthly_price,
        trial_days: trial_days || 0,
        is_active: true,
      })
    }

    if (yearly_price !== undefined) {
      pricesToInsert.push({
        plan_id: newPlan.id,
        billing_cycle: "yearly",
        price: yearly_price,
        trial_days: trial_days || 0,
        is_active: true,
      })
    }

    if (pricesToInsert.length > 0) {
      const { error: pricesError } = await supabase.from("subscription_prices").insert(pricesToInsert)

      if (pricesError) {
        console.error("[v0] Error creating prices:", pricesError)
        // Don't throw, plan was created successfully
      }
    }

    await logAdminAction({
      action: "create_subscription_plan",
      targetType: "plan",
      targetId: newPlan.id,
      details: { name: planData.name, monthly_price, yearly_price },
    })

    return NextResponse.json({ plan: newPlan })
  } catch (error) {
    console.error("[v0] Admin plan creation error:", error)
    return NextResponse.json({ error: "Failed to create subscription plan" }, { status: 500 })
  }
}
