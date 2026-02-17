import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, company_name, avatar_url, username } = body

    console.log("[v0] Updating profile for user:", user.id)
    console.log("[v0] Update data:", { name, company_name, avatar_url, username })

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (company_name !== undefined) updateData.company_name = company_name
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (username !== undefined) updateData.username = username

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Profile update error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("[v0] Profile updated successfully:", data)
    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error("[v0] Profile update exception:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 }
    )
  }
}
