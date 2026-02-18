import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSuperAdmin } from "@/lib/admin/auth"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is super admin - bypass all restrictions
    const userIsSuperAdmin = await isSuperAdmin()
    console.log("[v0] plan-limits API - User is super admin:", userIsSuperAdmin)

    if (userIsSuperAdmin) {
      console.log("[v0] Super admin detected - granting unlimited access")
      return NextResponse.json({
        isSuperAdmin: true,
        planName: "Super Admin",
        screens: { current: 0, limit: -1, canCreate: true },
        playlists: { current: 0, limit: -1, canCreate: true },
        storage: { currentBytes: 0, limitBytes: -1, currentMB: 0, limitMB: -1, canUpload: true, percentUsed: 0 },
        teamMembers: { current: 1, limit: -1, canInvite: true },
        features: {
          mediaLibrary: true,
          playlists: true,
          screens: true,
          locations: true,
          schedules: true,
          analytics: true,
          aiAnalytics: true,
          teamMembers: true,
          urlMedia: true,
        },
      })
    }

    // Get user subscription and plan
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(
        `
        *,
        subscription_plans (
          id,
          name,
          max_screens,
          max_playlists,
          max_media_storage,
          max_file_upload_size,
          max_locations,
          max_schedules,
          max_team_members,
          storage_unit
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (subError) {
      console.error("[v0] Error fetching subscription:", subError)
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    // Default to Free plan if no subscription
    const plan = (subscription?.subscription_plans as any) || {
      id: null,
      name: "Free",
      max_screens: 3,
      max_playlists: 5,
      max_media_storage: 1073741824, // 1GB
      max_file_upload_size: 10737418240, // 10GB
      max_locations: 1,
      max_schedules: 1,
      max_team_members: 0,
      storage_unit: "GB",
    }

    // Get current usage counts
    const { count: screensCount } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    const { count: playlistsCount } = await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    const { data: profile } = await supabase.from("profiles").select("current_storage_used_mb").eq("id", user.id).single()

    // Get feature permissions (only if plan has an id)
    let features: any[] | null = null
    let featuresError: any = null

    if (plan.id) {
      const result = await supabase
        .from("feature_permissions")
        .select("feature_key, is_enabled")
        .eq("plan_id", plan.id)
      features = result.data
      featuresError = result.error

      if (featuresError) {
        console.error("[v0] Error loading feature permissions:", featuresError)
      }
    }

    const featureMap: Record<string, boolean> = {}
    if (features && !featuresError) {
      features.forEach((f) => {
        featureMap[f.feature_key] = f.is_enabled
      })
    } else if (!plan.id) {
      // Default features for users without a plan (free tier defaults)
      featureMap["media_library"] = true
      featureMap["playlists"] = true
      featureMap["screens"] = true
      featureMap["locations"] = false
      featureMap["schedules"] = false
      featureMap["analytics"] = false
      featureMap["ai_analytics"] = false
      featureMap["team_members"] = false
      featureMap["url_media"] = true
    }
    console.log("[v0] Feature permissions loaded:", features)
    console.log("[v0] Feature map:", featureMap)

    // Calculate current storage in bytes
    const currentStorageBytes = (profile?.current_storage_used_mb || 0) * 1024 * 1024
    const maxStorageBytes = Number(plan.max_media_storage)

    // Build response
    const response = {
      isSuperAdmin: false,
      planName: plan.name,

      // Numeric limits with current usage
      screens: {
        current: screensCount || 0,
        limit: plan.max_screens,
        canCreate: plan.max_screens === -1 || (screensCount || 0) < plan.max_screens,
      },

      playlists: {
        current: playlistsCount || 0,
        limit: plan.max_playlists,
        canCreate: plan.max_playlists === -1 || (playlistsCount || 0) < plan.max_playlists,
      },

      storage: {
        currentBytes: currentStorageBytes,
        limitBytes: maxStorageBytes,
        currentMB: profile?.current_storage_used_mb || 0,
        limitMB: maxStorageBytes / (1024 * 1024),
        canUpload: maxStorageBytes === -1 || currentStorageBytes < maxStorageBytes,
        percentUsed: maxStorageBytes > 0 ? (currentStorageBytes / maxStorageBytes) * 100 : 0,
      },

      teamMembers: {
        current: 1, // TODO: Implement actual team members count when multi-user is developed
        limit: plan.max_team_members,
        canInvite: plan.max_team_members === -1 || 1 < plan.max_team_members,
      },

      // Binary features (on/off) - control navigation visibility
      features: {
        mediaLibrary: featureMap["media_library"] ?? true,
        playlists: featureMap["playlists"] ?? true,
        screens: featureMap["screens"] ?? true,
        locations: featureMap["locations"] ?? false,
        schedules: featureMap["schedules"] ?? false,
        analytics: featureMap["analytics"] ?? false,
        aiAnalytics: featureMap["ai_analytics"] ?? false,
        teamMembers: featureMap["team_members"] ?? false,
        urlMedia: featureMap["url_media"] ?? true,
      },
    }

    console.log("[v0] plan-limits response - Plan:", plan.name)
    console.log("[v0] Analytics feature check: featureMap['analytics']=", featureMap["analytics"])
    console.log("[v0] All features:", response.features)
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error fetching plan limits:", error)
    console.error("[v0] Error details:", JSON.stringify(error, null, 2))
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
