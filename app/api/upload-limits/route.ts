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

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select(`
        status,
        plan_id,
        subscription_plans (
          name,
          max_media_storage,
          max_file_upload_size,
          storage_unit,
          file_upload_unit
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .not("plan_id", "is", null)
      .maybeSingle()

    if (subscriptionError) {
        console.error("[v0] Subscription query error:", subscriptionError)
    }

    let maxStorage: number
    let storageUnit: string
    let maxFileSize: number
    let fileUploadUnit: string
    let planName: string

    if (subscriptionData && subscriptionData.subscription_plans) {
      const plan = subscriptionData.subscription_plans as any
      maxStorage = plan.max_media_storage
      storageUnit = plan.storage_unit || "GB"
      maxFileSize = plan.max_file_upload_size || 52428800 // Default to 50MB if not set
      fileUploadUnit = plan.file_upload_unit || "MB"
      planName = plan.name || "Unknown Plan"
    } else {
      // Fetch the free plan if no active subscription
      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("name, max_media_storage, max_file_upload_size, storage_unit, file_upload_unit")
        .or("name.eq.Free,name.eq.free") // Check for "Free" or "free"
        .eq("is_active", true)
        .maybeSingle()

      if (freePlan && !freePlanError) {
        maxStorage = freePlan.max_media_storage
        storageUnit = freePlan.storage_unit || "GB"
        maxFileSize = freePlan.max_file_upload_size || 52428800 // Default to 50MB
        fileUploadUnit = freePlan.file_upload_unit || "MB"
        planName = freePlan.name
      } else {
        // Hardcoded fallback if no free plan is found
        maxStorage = 1073741824 // 1 GB
        storageUnit = "GB"
        maxFileSize = 52428800 // 50 MB
        fileUploadUnit = "MB"
        planName = "Free"
      }
    }


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

    return NextResponse.json(
      {
        maxStorage,
        storageUnit,
        currentStorageBytes,
        maxFileSize,
        fileUploadUnit,
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
    console.error("[v0] upload-limits API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
