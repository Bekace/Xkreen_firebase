import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSuperAdmin } from "@/lib/admin/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] plan-limits API called")
    const supabase = await createClient()

    // Get current user
    console.log("[v0] Getting user...")
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("[v0] User error:", userError)
      return NextResponse.json({ error: "Auth error", details: userError.message }, { status: 401 })
    }
    
    if (!user) {
      console.error("[v0] No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("[v0] User found:", user.id)

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
    console.log("[v0] Fetching subscription for user:", user.id)
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
      console.error("[v0] CRITICAL - Subscription query error:", subError)
      return NextResponse.json({ 
        error: "Database query failed", 
        details: subError.message,
        hint: subError.hint 
      }, { status: 500 })
    }
    
    console.log("[v0] Subscription data:", subscription ? "Found" : "None")

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
    console.log("[v0] Fetching screens count...")
    const { count: screensCount, error: screensError } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
    
    if (screensError) {
      console.error("[v0] Error fetching screens count:", screensError)
    } else {
      console.log("[v0] Screens count:", screensCount)
    }

    console.log("[v0] Fetching playlists count...")
    const { count: playlistsCount, error: playlistsError } = await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
    
    if (playlistsError) {
      console.error("[v0] Error fetching playlists count:", playlistsError)
    } else {
      console.log("[v0] Playlists count:", playlistsCount)
    }

    console.log("[v0] Fetching profile storage...")
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("current_storage_used_mb")
      .eq("id", user.id)
      .single()
    
    if (profileError) {
      console.error("[v0] Error fetching profile:", profileError)
    } else {
      console.log("[v0] Profile storage:", profile?.current_storage_used_mb)
    }

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
    console.log("[v0] Building response...")
    const currentStorageBytes = (profile?.current_storage_used_mb || 0) * 1024 * 1024
    const maxStorageBytes = Number(plan.max_media_storage)
    console.log("[v0] Storage calculation - Current:", currentStorageBytes, "Max:", maxStorageBytes)

    // Build response
    console.log("[v0] Creating response object...")
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
    console.log("[v0] Response object complete, returning...")

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] CRITICAL ERROR in plan-limits API:")
    console.error("[v0] Error:", error)
    console.error("[v0] Error type:", typeof error)
    console.error("[v0] Error name:", error instanceof Error ? error.name : "Unknown")
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("[v0] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
