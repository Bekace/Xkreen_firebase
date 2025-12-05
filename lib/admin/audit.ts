import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

interface AuditLogData {
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function logAdminAction(data: AuditLogData) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignore cookie setting errors in server components
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: user.id,
    action: data.action,
    target_type: data.targetType,
    target_id: data.targetId,
    details: data.details,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
  })

  if (error) {
    console.error("[v0] Failed to log admin action:", error)
  }
}
