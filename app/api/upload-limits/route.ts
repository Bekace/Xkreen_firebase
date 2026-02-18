import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching user data for user ID:", user.id)

    const { data: uploadSettingsArray } = await supabase.from("upload_settings").select("*").limit(1)
    const uploadSettings = uploadSettingsArray?.[0] || null
    console.log("[v0] Upload settings:", uploadSettings)

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select(`
        status,
        plan_id,
        subscription_plans (
          name,
          max_media_storage,
          max_file_upload_size,
          storage_unit
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .not("plan_id", "is", null)
      .maybeSingle()

    console.log("[v0] Subscription query result:", { subscriptionData, subscriptionError })

    let maxStorage = 3145728
    let storageUnit = "MB"
    let maxFileSize = 52428800
    let planName = "Free"

    if (subscriptionData && !subscriptionError && subscriptionData.subscription_plans) {
      const plan = subscriptionData.subscription_plans
      maxStorage = Number.parseInt(plan.max_media_storage)
      storageUnit = plan.storage_unit || "MB"
      maxFileSize =
        uploadSettings?.enforce_globally && uploadSettings.max_file_size
          ? uploadSettings.max_file_size
          : plan.max_file_upload_size || 52428800
      planName = plan.name || "Free"
      console.log("[v0] Using subscription plan storage:", {
        maxStorage,
        storageUnit,
        maxFileSize,
        planName,
        enforceGlobally: uploadSettings?.enforce_globally,
      })
    } else {
      console.log("[v0] No active subscription found, fetching Free plan")

      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("max_media_storage, max_file_upload_size, storage_unit, name")
        .eq("price", 0)
        .eq("is_active", true)
        .maybeSingle()

      console.log("[v0] Free plan query result:", { freePlan, freePlanError })

      if (freePlan && !freePlanError) {
        maxStorage = Number.parseInt(freePlan.max_media_storage)
        storageUnit = freePlan.storage_unit || "MB"
        maxFileSize =
          uploadSettings?.enforce_globally && uploadSettings.max_file_size
            ? uploadSettings.max_file_size
            : freePlan.max_file_upload_size || 52428800
        planName = freePlan.name || "Free"
        console.log("[v0] Using Free plan storage:", {
          maxStorage,
          storageUnit,
          maxFileSize,
          planName,
          enforceGlobally: uploadSettings?.enforce_globally,
        })
      } else {
        console.log("[v0] Free plan not found, using hardcoded defaults")
        if (uploadSettings?.enforce_globally && uploadSettings.max_file_size) {
          maxFileSize = uploadSettings.max_file_size
        }
      }
    }

    console.log("[v0] Final storage limits:", { maxStorage, storageUnit, maxFileSize, planName })

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

    console.log("[v0] Current storage bytes:", currentStorageBytes)

    return NextResponse.json(
      {
        maxStorage,
        storageUnit,
        currentStorageBytes,
        maxFileSize,
        planName,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.log("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
