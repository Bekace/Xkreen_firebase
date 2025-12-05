import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching user data for user ID:", user.id)

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select(`
        status,
        plan_id,
        subscription_plans (
          max_media_storage,
          storage_unit
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .not("plan_id", "is", null)
      .maybeSingle()

    console.log("[v0] Subscription query result:", { subscriptionData, subscriptionError })

    let maxStorage = 3145728 // Default 3 MB in bytes
    let storageUnit = "MB"

    if (subscriptionData && !subscriptionError && subscriptionData.subscription_plans) {
      // User has an active subscription with valid plan
      const plan = subscriptionData.subscription_plans
      maxStorage = Number.parseInt(plan.max_media_storage)
      storageUnit = plan.storage_unit || "MB"
      console.log("[v0] Using subscription plan storage:", { maxStorage, storageUnit })
    } else {
      // User has no active subscription or broken plan reference - fetch Free plan
      console.log("[v0] No active subscription found, fetching Free plan")

      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("max_media_storage, storage_unit, name")
        .eq("price", 0)
        .eq("is_active", true)
        .maybeSingle()

      console.log("[v0] Free plan query result:", { freePlan, freePlanError })

      if (freePlan && !freePlanError) {
        maxStorage = Number.parseInt(freePlan.max_media_storage)
        storageUnit = freePlan.storage_unit || "MB"
        console.log("[v0] Using Free plan storage:", { maxStorage, storageUnit })
      } else {
        console.log("[v0] Free plan not found, using hardcoded defaults")
      }
    }

    console.log("[v0] Final storage limits:", { maxStorage, storageUnit })

    // Calculate current storage usage
    const { data: mediaData, error: mediaError } = await supabase
      .from("media")
      .select("file_size")
      .eq("user_id", user.id)

    if (mediaError) {
      return NextResponse.json({ error: "Failed to calculate storage usage" }, { status: 500 })
    }

    const currentStorageBytes =
      mediaData?.reduce((total, item) => {
        const fileSize = item.file_size || 0
        return total + fileSize
      }, 0) || 0

    return NextResponse.json({
      maxStorage,
      storageUnit,
      currentStorageBytes,
    })
  } catch (error) {
    console.log("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
