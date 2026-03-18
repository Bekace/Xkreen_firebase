import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/dashboard"
  const mode = requestUrl.searchParams.get("mode") || "signup"

  // For production, we MUST use the canonical site URL from the environment variables.
  // The request origin can be incorrect in server environments.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  
  // If the siteUrl is not defined, there is a configuration error.
  if (!siteUrl) {
    const errorUrl = new URL("/auth/login?error=configuration_error", requestUrl.origin)
    return NextResponse.redirect(errorUrl)
  }

  if (code) {
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
              // Ignore errors in edge cases
            }
          },
        },
      },
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session?.user?.aud === "authenticated" && next === "/auth/reset-password") {
      return NextResponse.redirect(new URL("/auth/reset-password", siteUrl))
    }

    if (!error && data.user) {
      const serviceSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
              } catch {
                // Ignore errors in edge cases
              }
            },
          },
        },
      )

      const { data: existingProfile } = await serviceSupabase
        .from("profiles")
        .select("id, deleted_at")
        .eq("id", data.user.id)
        .single()

      if (existingProfile && existingProfile.deleted_at) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL("/auth/login?error=account_deleted", siteUrl))
      }

      const teamMemberId = data.user.user_metadata?.team_member_id
      const isTeamInvite = !!teamMemberId

      if (mode === "login" && !existingProfile && !isTeamInvite) {
        await supabase.auth.signOut()
        await serviceSupabase.auth.admin.deleteUser(data.user.id)
        return NextResponse.redirect(new URL("/auth/login?error=no_account", siteUrl))
      }

      if (!existingProfile) {
        await serviceSupabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "",
          role: "user",
        })
      }

      if (teamMemberId) {
        await serviceSupabase
          .from("team_members")
          .update({ status: "active", joined_at: new Date().toISOString() })
          .eq("id", teamMemberId)
      }

      const isGoingToCheckout = next.includes("/auth/oauth-checkout")

      if (!isGoingToCheckout) {
        const { data: existingSubscription } = await serviceSupabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", data.user.id)
          .single()

        if (!existingSubscription) {
          const { data: freePlan } = await serviceSupabase
            .from("subscription_plans")
            .select("id")
            .eq("name", "Free")
            .eq("is_active", true)
            .single()

          if (freePlan) {
            const { data: freePrice } = await serviceSupabase
              .from("subscription_prices")
              .select("id")
              .eq("plan_id", freePlan.id)
              .eq("billing_cycle", "monthly")
              .eq("is_active", true)
              .single()

            await serviceSupabase.from("user_subscriptions").insert({
              user_id: data.user.id,
              plan_id: freePlan.id,
              price_id: freePrice?.id,
              status: "active",
              started_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            })
          }

          return NextResponse.redirect(new URL("/dashboard?welcome=true", siteUrl))
        }
      }

      return NextResponse.redirect(new URL(next, siteUrl))
    }
  }

  const siteUrlForLogin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
  return NextResponse.redirect(new URL("/auth/login", siteUrlForLogin))
}
