import { createClient } from "@/lib/supabase/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch upload settings
    const { data: settings, error } = await supabase.from("upload_settings").select("*").single()

    if (error) {
      console.error("[v0] Failed to fetch upload settings:", error)
      return NextResponse.json({ error: "Failed to fetch upload settings" }, { status: 500 })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("[v0] Upload settings GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    // Require super admin
    await requireSuperAdmin()

    const supabase = await createClient()
    const body = await request.json()

    const { max_file_size, allowed_file_types, enforce_globally } = body

    // Validate input
    if (max_file_size && (typeof max_file_size !== "number" || max_file_size <= 0)) {
      return NextResponse.json({ error: "Invalid max file size" }, { status: 400 })
    }

    if (allowed_file_types && !Array.isArray(allowed_file_types)) {
      return NextResponse.json({ error: "Invalid allowed file types" }, { status: 400 })
    }

    if (enforce_globally !== undefined && typeof enforce_globally !== "boolean") {
      return NextResponse.json({ error: "Invalid enforce_globally value" }, { status: 400 })
    }

    // Update settings
    const { data, error } = await supabase
      .from("upload_settings")
      .update({
        max_file_size: max_file_size,
        allowed_file_types: allowed_file_types,
        enforce_globally: enforce_globally,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .select()
      .single()

    if (error) {
      console.error("[v0] Failed to update upload settings:", error)
      return NextResponse.json({ error: "Failed to update upload settings" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Upload settings PUT error:", error)

    // Handle authorization errors
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
