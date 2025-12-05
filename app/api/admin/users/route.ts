import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin()

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: users, error: usersError } = await adminSupabase
      .from("profiles")
      .select("id, email, role, created_at, full_name, company_name")
      .order("created_at", { ascending: false })

    if (usersError) throw usersError

    const { data: subscriptions, error: subscriptionsError } = await adminSupabase.from("user_subscriptions").select(`
        user_id,
        status,
        plan_id,
        created_at,
        subscription_plans(name, id)
      `)

    if (subscriptionsError) throw subscriptionsError

    const subscriptionMap = new Map()
    subscriptions?.forEach((sub: any) => {
      subscriptionMap.set(sub.user_id, sub)
    })

    const formattedUsers = users.map((user: any) => {
      const subscription = subscriptionMap.get(user.id)

      return {
        id: user.id,
        email: user.email,
        role: user.role || "user",
        created_at: user.created_at,
        full_name: user.full_name,
        company_name: user.company_name,
        subscription_status: subscription?.status || "inactive",
        subscription_plan: subscription?.subscription_plans?.name || null,
        subscription_plan_id: subscription?.plan_id || null,
      }
    })

    await logAdminAction({
      action: "view_users",
      targetType: "user",
      details: { count: formattedUsers.length },
    })

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error("Admin users fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin()
    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 })
    }

    const { data: newUser, error } = await supabase
      .from("profiles")
      .insert({
        email,
        role,
      })
      .select()
      .single()

    if (error) throw error

    await logAdminAction({
      action: "create_user",
      targetType: "user",
      targetId: newUser.id,
      details: { email, role },
    })

    return NextResponse.json({ user: newUser })
  } catch (error) {
    console.error("Admin user creation error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
