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

    await logAdminAction({
      action: "view_subscription_plans",
      targetType: "plan",
      details: { count: plans.length },
    })

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

    const { monthly_price, yearly_price, trial_days, ...planData } = body

    // Create the plan first
    const { data: newPlan, error: planError } = await supabase
      .from("subscription_plans")
      .insert({
        name: planData.name,
        description: planData.description,
        max_screens: planData.max_screens,
        max_media_storage: planData.max_media_storage,
        storage_unit: planData.storage_unit,
        max_playlists: planData.max_playlists,
        is_active: planData.is_active,
      })
      .select()
      .single()

    if (planError) throw planError

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
