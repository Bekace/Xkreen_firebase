import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: location, error } = await supabase
      .from("locations")
      .select(
        `
        *,
        screen_locations(
          screen_id,
          screens(id, name, status, screen_code, orientation, resolution)
        )
      `
      )
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (error || !location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    return NextResponse.json({ location })
  } catch (error) {
    console.error("Error fetching location:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
      status,
      tags,
      notes,
    } = body

    // Convert empty strings to null for UUID fields
    const { data: location, error } = await supabase
      .from("locations")
      .update({
        name,
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
        tags: tags || null,
        notes: notes || null,
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating location:", error)
      return NextResponse.json({ error: "Failed to update location" }, { status: 500 })
    }

    return NextResponse.json({ location })
  } catch (error) {
    console.error("Error in location PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase.from("locations").delete().eq("id", params.id).eq("user_id", user.id)

    if (error) {
      console.error("Error deleting location:", error)
      return NextResponse.json({ error: "Failed to delete location" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in location DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
