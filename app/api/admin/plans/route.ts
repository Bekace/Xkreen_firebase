import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdmin()

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select(`
        *,
        user_subscriptions(count)
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    const formattedPlans = plans.map((plan: any) => ({
      ...plan,
      subscriber_count: plan.user_subscriptions?.filter((sub: any) => sub.count > 0).length || 0,
    }))

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
    const { supabase } = await requireSuperAdmin()
    const planData = await request.json()

    const { storage_unit, ...planDataWithoutUnit } = planData

    // Try to insert with storage_unit first, fallback without it if column doesn't exist
    const insertData = planData
    let newPlan
    let error

    try {
      const result = await supabase.from("subscription_plans").insert(insertData).select().single()
      newPlan = result.data
      error = result.error
    } catch (insertError: any) {
      // If storage_unit column doesn't exist, try without it
      if (insertError?.message?.includes("storage_unit")) {
        console.log("[v0] storage_unit column not found, inserting without it")
        const result = await supabase.from("subscription_plans").insert(planDataWithoutUnit).select().single()
        newPlan = result.data
        error = result.error
      } else {
        throw insertError
      }
    }

    if (error) throw error

    await logAdminAction({
      action: "create_subscription_plan",
      targetType: "plan",
      targetId: newPlan.id,
      details: { name: planData.name, price: planData.price },
    })

    return NextResponse.json({ plan: newPlan })
  } catch (error) {
    console.error("[v0] Admin plan creation error:", error)
    return NextResponse.json({ error: "Failed to create subscription plan" }, { status: 500 })
  }
}
