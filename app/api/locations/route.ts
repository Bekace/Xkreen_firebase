import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      console.error("[v0] Failed to create Supabase client")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching locations for user:", user.id)

    // Check if user has access to location management feature
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("[v0] Profile error:", profileError)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    console.log("[v0] User profile role:", profile.role)

    // Check subscription - Free users cannot access locations
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(`
        plan_id,
        subscription_plans!inner(name)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    console.log("[v0] Subscription data:", subscription)
    console.log("[v0] Subscription error:", subError)

    // Allow if no subscription (for testing) or if not Free plan
    const planName = subscription?.subscription_plans?.name
    if (planName === "Free") {
      console.log("[v0] Free user blocked from locations")
      return NextResponse.json(
        { error: "Location management is not available on the Free plan. Please upgrade." },
        { status: 403 }
      )
    }

    // Fetch locations with screen count
    const { data: locations, error } = await supabase
      .from("locations")
      .select(
        `
        *,
        screen_locations(
          screen_id,
          screens(id, name, status)
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching locations:", error)
      return NextResponse.json({ error: "Failed to fetch locations", details: error.message }, { status: 500 })
    }

    console.log("[v0] Fetched locations count:", locations?.length || 0)

    // Transform data to include screen count
    const transformedLocations = locations.map((location) => ({
      ...location,
      screen_count: location.screen_locations?.length || 0,
      screens: location.screen_locations?.map((sl: any) => sl.screens) || [],
    }))

    return NextResponse.json({ locations: transformedLocations })
  } catch (error) {
    console.error("[v0] Error in locations GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      console.error("[v0] Failed to create Supabase client")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Creating location for user:", user.id)

    // Check subscription - Free users cannot access locations
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select(`
        plan_id,
        subscription_plans!inner(name)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    const planName = subscription?.subscription_plans?.name
    if (planName === "Free") {
      console.log("[v0] Free user blocked from creating location")
      return NextResponse.json(
        { error: "Location management is not available on the Free plan. Please upgrade." },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      name,
      description,
      parent_location_id,
      address,
      city,
      state,
      zip_code,
      country,
      latitude,
      longitude,
      contact_person,
      phone_number,
      operating_hours,
      status = "active",
      tags = [],
      notes,
    } = body

    if (!name || name.trim() === "") {
      console.log("[v0] Location name missing")
      return NextResponse.json({ error: "Location name is required" }, { status: 400 })
    }

    console.log("[v0] Inserting location:", name)

    const { data: location, error } = await supabase
      .from("locations")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description || null,
        parent_location_id: parent_location_id || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zip_code || null,
        country: country || null,
        latitude: latitude || null,
        longitude: longitude || null,
        contact_person: contact_person || null,
        phone_number: phone_number || null,
        operating_hours: operating_hours || null,
        status,
        tags,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating location:", error)
      return NextResponse.json({ error: "Failed to create location", details: error.message }, { status: 500 })
    }

    console.log("[v0] Location created successfully:", location.id)

    return NextResponse.json({ location }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error in locations POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
