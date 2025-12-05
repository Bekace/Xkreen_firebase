import { type NextRequest, NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Analytics settings GET request started")

    const { searchParams } = new URL(request.url)
    const screenId = searchParams.get("screenId")

    console.log("[v0] Fetching analytics settings for screen:", screenId)

    if (!screenId) {
      console.log("[v0] No screenId provided")
      return NextResponse.json({ error: "Screen ID is required" }, { status: 400 })
    }

    console.log("[v0] Checking for service role key...")
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v0] SUPABASE_SERVICE_ROLE_KEY not found in environment")
      return NextResponse.json(
        {
          error: "Service configuration error",
          details: "Service role key not configured",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Creating service role client...")
    const supabase = createServiceRoleClient() // Removed await since createServiceRoleClient is now synchronous
    console.log("[v0] Service role client created successfully")

    console.log("[v0] Querying analytics_settings table...")
    const { data: settings, error } = await supabase
      .from("analytics_settings")
      .select("*")
      .eq("screen_id", screenId)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching analytics settings:", error)
      return NextResponse.json(
        {
          error: "Failed to fetch analytics settings",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Query successful, settings:", settings)

    // Return settings or defaults
    const result = {
      enabled: settings?.enabled || false,
      retention_days: settings?.retention_days || 30,
      consent_required: settings?.consent_required || true,
      sampling_rate: settings?.sampling_rate || 5,
      privacy_mode: settings?.privacy_mode || true,
    }

    console.log("[v0] Returning analytics settings:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Analytics settings fetch error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { screenId, enabled, retention_days, consent_required, sampling_rate, privacy_mode } = body

    console.log("[v0] Updating analytics settings:", { screenId, enabled })

    if (!screenId) {
      return NextResponse.json({ error: "Screen ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log("[v0] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns the screen
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("id")
      .eq("id", screenId)
      .eq("user_id", user.id)
      .single()

    if (screenError || !screen) {
      console.log("[v0] Screen access error:", screenError)
      return NextResponse.json({ error: "Screen not found or access denied" }, { status: 404 })
    }

    // Upsert analytics settings
    const { data: settings, error } = await supabase
      .from("analytics_settings")
      .upsert(
        {
          screen_id: screenId,
          user_id: user.id,
          enabled: enabled !== undefined ? enabled : false,
          retention_days: retention_days || 30,
          consent_required: consent_required !== undefined ? consent_required : true,
          sampling_rate: sampling_rate || 5,
          privacy_mode: privacy_mode !== undefined ? privacy_mode : true,
        },
        {
          onConflict: "screen_id",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("Error updating analytics settings:", error)
      return NextResponse.json({ error: "Failed to update analytics settings" }, { status: 500 })
    }

    console.log("[v0] Analytics settings updated successfully:", settings)

    return NextResponse.json({
      success: true,
      settings: {
        enabled: settings.enabled,
        retention_days: settings.retention_days,
        consent_required: settings.consent_required,
        sampling_rate: settings.sampling_rate,
        privacy_mode: settings.privacy_mode,
      },
    })
  } catch (error) {
    console.error("Analytics settings update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
