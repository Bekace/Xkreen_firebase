import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const body = await request.json()
    const planId = params.id

    const { monthly_price, yearly_price, trial_days, ...planData } = body

    // Update the plan
    const { data: updatedPlan, error: planError } = await supabase
      .from("subscription_plans")
      .update({
        name: planData.name,
        description: planData.description,
        max_screens: planData.max_screens,
        max_media_storage: planData.max_media_storage,
        storage_unit: planData.storage_unit,
        max_playlists: planData.max_playlists,
        is_active: planData.is_active,
      })
      .eq("id", planId)
      .select()
      .single()

    if (planError) throw planError

    // First, get existing prices
    const { data: existingPrices } = await supabase.from("subscription_prices").select("*").eq("plan_id", planId)

    const monthlyPriceRecord = existingPrices?.find((p: any) => p.billing_cycle === "monthly")
    const yearlyPriceRecord = existingPrices?.find((p: any) => p.billing_cycle === "yearly")

    // Update or insert monthly price
    if (monthly_price !== undefined) {
      if (monthlyPriceRecord) {
        await supabase
          .from("subscription_prices")
          .update({ price: monthly_price, trial_days: trial_days || 0 })
          .eq("id", monthlyPriceRecord.id)
      } else {
        await supabase.from("subscription_prices").insert({
          plan_id: planId,
          billing_cycle: "monthly",
          price: monthly_price,
          trial_days: trial_days || 0,
          is_active: true,
        })
      }
    }

    // Update or insert yearly price
    if (yearly_price !== undefined) {
      if (yearlyPriceRecord) {
        await supabase
          .from("subscription_prices")
          .update({ price: yearly_price, trial_days: trial_days || 0 })
          .eq("id", yearlyPriceRecord.id)
      } else {
        await supabase.from("subscription_prices").insert({
          plan_id: planId,
          billing_cycle: "yearly",
          price: yearly_price,
          trial_days: trial_days || 0,
          is_active: true,
        })
      }
    }

    await logAdminAction({
      action: "update_subscription_plan",
      targetType: "plan",
      targetId: planId,
      details: { name: planData.name, monthly_price, yearly_price },
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

    const { error: pricesError } = await supabase.from("subscription_prices").delete().eq("plan_id", planId)

    if (pricesError) {
      console.error("[v0] Error deleting prices:", pricesError)
    }

    // Delete the plan
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
