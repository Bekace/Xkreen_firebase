import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    // Check if user has access to location management feature
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, subscription_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Free users cannot access locations
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("plan_id, subscription_plans(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single()

    if (subscription?.subscription_plans?.name === "Free") {
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
      console.error("Error fetching locations:", error)
      return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
    }

    // Transform data to include screen count
    const transformedLocations = locations.map((location) => ({
      ...location,
      screen_count: location.screen_locations?.length || 0,
      screens: location.screen_locations?.map((sl: any) => sl.screens) || [],
    }))

    return NextResponse.json({ locations: transformedLocations })
  } catch (error) {
    console.error("Error in locations GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has access to location management feature
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("plan_id, subscription_plans(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single()

    if (subscription?.subscription_plans?.name === "Free") {
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
      return NextResponse.json({ error: "Location name is required" }, { status: 400 })
    }

    const { data: location, error } = await supabase
      .from("locations")
      .insert({
        user_id: user.id,
        name: name.trim(),
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
        status,
        tags,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating location:", error)
      return NextResponse.json({ error: "Failed to create location" }, { status: 500 })
    }

    return NextResponse.json({ location }, { status: 201 })
  } catch (error) {
    console.error("Error in locations POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
