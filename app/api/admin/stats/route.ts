import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdmin()

    const [usersResult, subscriptionsResult, systemResult, trendsResult, activityResult] = await Promise.all([
      // User statistics
      supabase
        .from("profiles")
        .select("role, created_at"),

      // Subscription statistics
      supabase
        .from("user_subscriptions")
        .select(`
          *,
          subscription_plans(name, price)
        `)
        .eq("status", "active"),

      // System statistics (mock data for now)
      Promise.resolve({
        data: {
          totalStorage: 1024 * 1024 * 1024 * 50, // 50GB
          activeScreens: 45,
          totalMedia: 1250,
          systemUptime: 99.8,
        },
      }),

      // Growth trends (mock data for demo)
      Promise.resolve({
        data: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          newUsers: Math.floor(Math.random() * 20) + 5,
          revenue: Math.floor(Math.random() * 5000) + 1000,
          activeUsers: Math.floor(Math.random() * 100) + 200,
        })),
      }),

      // Recent activity from audit logs
      supabase
        .from("admin_audit_logs")
        .select(`
          id,
          action,
          created_at,
          target_type,
          profiles!admin_user_id(email)
        `)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    if (usersResult.error) throw usersResult.error
    if (subscriptionsResult.error) throw subscriptionsResult.error

    const users = usersResult.data || []
    const subscriptions = subscriptionsResult.data || []

    // Process user statistics
    const userStats = {
      total: users.length,
      active: users.filter((u) => {
        const createdAt = new Date(u.created_at)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        return createdAt > thirtyDaysAgo
      }).length,
      inactive:
        users.length -
        users.filter((u) => {
          const createdAt = new Date(u.created_at)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          return createdAt > thirtyDaysAgo
        }).length,
      newThisMonth: users.filter((u) => {
        const createdAt = new Date(u.created_at)
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        return createdAt >= monthStart
      }).length,
      superAdmins: users.filter((u) => u.role === "superadmin").length,
      admins: users.filter((u) => u.role === "admin").length,
    }

    // Process subscription statistics
    const planStats = subscriptions.reduce((acc: any, sub: any) => {
      const planName = sub.subscription_plans?.name || "Unknown"
      const planPrice = sub.subscription_plans?.price || 0

      if (!acc[planName]) {
        acc[planName] = { name: planName, count: 0, revenue: 0 }
      }
      acc[planName].count++
      acc[planName].revenue += planPrice
      return acc
    }, {})

    const subscriptionStats = {
      total: subscriptions.length,
      active: subscriptions.filter((s: any) => s.status === "active").length,
      expired: subscriptions.filter((s: any) => s.status === "expired").length,
      revenue: Object.values(planStats).reduce((sum: number, plan: any) => sum + plan.revenue, 0),
      plans: Object.values(planStats),
    }

    // Process recent activity
    const recentActivity = (activityResult.data || []).map((log: any) => ({
      id: log.id,
      action: log.action,
      user: log.profiles?.email || "System",
      timestamp: new Date(log.created_at).toLocaleString(),
      type: log.target_type || "system",
    }))

    // Log admin action
    await logAdminAction({
      action: "view_admin_dashboard",
      targetType: "system",
      details: { timestamp: new Date().toISOString() },
    })

    const stats = {
      users: userStats,
      subscriptions: subscriptionStats,
      system: systemResult.data,
      trends: trendsResult.data,
      recentActivity,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Admin stats error:", error)
    return NextResponse.json({ error: "Failed to fetch admin statistics" }, { status: 500 })
  }
}
