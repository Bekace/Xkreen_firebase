import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// DELETE - remove a team member
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - update a team member role
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { role } = body

    const { data: member, error } = await supabase
      .from("team_members")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ member })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
