import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    // Check if user is super admin by querying profile role directly
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const userIsSuperAdmin = userProfile?.role === "superadmin"

    if (userIsSuperAdmin) {
      return NextResponse.json({
        isSuperAdmin: true,
        planName: "Super Admin",
        limits: {
          maxScreens: -1,
          maxPlaylists: -1,
          maxMediaStorage: -1,
          maxLocations: -1,
          maxSchedules: -1,
          maxTeamMembers: -1,
        },
        usage: {
          screensUsed: 0,
          playlistsUsed: 0,
          storageUsed: 0,
        },
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
      console.error("[v0] Subscription query error:", subError)
    }

    // Default to Free plan if no subscription
    const plan = (subscription?.subscription_plans as any) || {
      id: null,
      name: "Free",
      max_screens: 3,
      max_playlists: 5,
      max_media_storage: 1073741824,
      max_file_upload_size: 10737418240,
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_storage_used_mb")
      .eq("id", user.id)
      .single()

    // Get feature permissions
    const featureMap: Record<string, boolean> = {}

    if (plan.id) {
      const { data: features, error: featuresError } = await supabase
        .from("feature_permissions")
        .select("feature_key, is_enabled")
        .eq("plan_id", plan.id)

      if (!featuresError && features) {
        console.log("[v0] Raw features from DB:", features)
        features.forEach((f) => {
          featureMap[f.feature_key] = f.is_enabled
        })
        console.log("[v0] Feature map after processing:", featureMap)
      }
    }

    // Calculate storage
    const currentStorageBytes = (profile?.current_storage_used_mb || 0) * 1024 * 1024
    const maxStorageBytes = Number(plan.max_media_storage)

    const response = {
      isSuperAdmin: false,
      planName: plan.name,
      limits: {
        maxScreens: plan.max_screens,
        maxPlaylists: plan.max_playlists,
        maxMediaStorage: maxStorageBytes,
        maxLocations: plan.max_locations ?? 1,
        maxSchedules: plan.max_schedules ?? 1,
        maxTeamMembers: plan.max_team_members ?? 0,
      },
      usage: {
        screensUsed: screensCount || 0,
        playlistsUsed: playlistsCount || 0,
        storageUsed: currentStorageBytes,
      },
      features: {
        mediaLibrary: featureMap["media_library"] ?? false,
        playlists: featureMap["playlists"] ?? false,
        screens: featureMap["screens"] ?? false,
        locations: featureMap["locations"] ?? false,
        schedules: featureMap["schedules"] ?? false,
        analytics: featureMap["analytics"] ?? false,
        aiAnalytics: featureMap["ai_analytics"] ?? false,
        teamMembers: featureMap["team_members"] ?? false,
        urlMedia: featureMap["url_media"] ?? false,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] plan-limits error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
