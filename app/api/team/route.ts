import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServerClient } from "@supabase/ssr"

function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

// GET - list team members for the current user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: members, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ members: members || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - invite a new team member via Supabase auth invite email
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { member_name, member_email, role = "editor" } = body

    if (!member_name || !member_email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    // Check if already invited
    const { data: existing } = await supabase
      .from("team_members")
      .select("id")
      .eq("owner_id", user.id)
      .eq("member_email", member_email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "This email has already been invited" }, { status: 409 })
    }

    // Check plan limit
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("plan_id, subscription_plans(max_team_members)")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle()

    const maxTeamMembers = (subscription?.subscription_plans as any)?.max_team_members ?? 1
    if (maxTeamMembers !== -1) {
      const { count } = await supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
      if ((count ?? 0) >= maxTeamMembers) {
        return NextResponse.json({ error: "Team member limit reached for your plan" }, { status: 403 })
      }
    }

    // Insert the pending team member record first
    const { data: member, error: insertError } = await supabase
      .from("team_members")
      .insert({ owner_id: user.id, member_name, member_email, role, status: "pending" })
      .select()
      .single()

    if (insertError) throw insertError

    // Send the actual invite email via Supabase admin API
    const adminClient = createAdminClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://v0-xkreen-ai.vercel.app"
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(member_email, {
      redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      data: {
        full_name: member_name,
        invited_by: user.email,
        team_member_id: member.id,
        role,
      },
    })

    if (inviteError) {
      // If invite email fails (e.g. user already exists in auth), still keep the record
      // but surface the warning — the user can still log in and access the dashboard
      console.error("[team] Supabase invite error:", inviteError.message)
    }

    return NextResponse.json({ member })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
