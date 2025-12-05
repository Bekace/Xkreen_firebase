import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const planData = await request.json()
    const planId = params.id

    const { storage_unit, ...planDataWithoutUnit } = planData

    // Try to update with storage_unit first, fallback without it if column doesn't exist
    const updateData = planData
    let updatedPlan
    let error

    try {
      const result = await supabase.from("subscription_plans").update(updateData).eq("id", planId).select().single()
      updatedPlan = result.data
      error = result.error
    } catch (updateError: any) {
      // If storage_unit column doesn't exist, try without it
      if (updateError?.message?.includes("storage_unit")) {
        console.log("[v0] storage_unit column not found, updating without it")
        const result = await supabase
          .from("subscription_plans")
          .update(planDataWithoutUnit)
          .eq("id", planId)
          .select()
          .single()
        updatedPlan = result.data
        error = result.error
      } else {
        throw updateError
      }
    }

    if (error) throw error

    await logAdminAction({
      action: "update_subscription_plan",
      targetType: "plan",
      targetId: planId,
      details: { name: planData.name, price: planData.price },
    })

    return NextResponse.json({ plan: updatedPlan })
  } catch (error) {
    console.error("[v0] Admin plan update error:", error)
    return NextResponse.json({ error: "Failed to update subscription plan" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const planId = params.id

    // Check if plan has active subscribers
    const { data: subscribers, error: checkError } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("plan_id", planId)
      .eq("status", "active")

    if (checkError) throw checkError

    if (subscribers && subscribers.length > 0) {
      return NextResponse.json({ error: "Cannot delete plan with active subscribers" }, { status: 400 })
    }

    const { error } = await supabase.from("subscription_plans").delete().eq("id", planId)

    if (error) throw error

    await logAdminAction({
      action: "delete_subscription_plan",
      targetType: "plan",
      targetId: planId,
      details: { timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin plan deletion error:", error)
    return NextResponse.json({ error: "Failed to delete subscription plan" }, { status: 500 })
  }
}
