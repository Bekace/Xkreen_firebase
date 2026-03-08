import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function toFeatureName(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: permissions, error } = await supabase
      .from("feature_permissions")
      .select(`feature_key, is_enabled, plan_id, subscription_plans(id, name)`)
      .order("feature_key")

    if (error) throw error

    // Build a map of plan_name -> enabled feature names
    const planFeatures: Record<string, string[]> = {}

    permissions.forEach((p: any) => {
      const planName: string = p.subscription_plans?.name
      if (!planName) return
      if (!planFeatures[planName]) planFeatures[planName] = []
      if (p.is_enabled) {
        planFeatures[planName].push(toFeatureName(p.feature_key))
      }
    })

    return NextResponse.json({ planFeatures })
  } catch (error) {
    console.error("Pricing features fetch error:", error)
    return NextResponse.json({ planFeatures: {} }, { status: 500 })
  }
}
