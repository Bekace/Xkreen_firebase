import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/dashboard"
  const mode = requestUrl.searchParams.get("mode") || "signup"

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

      // If profile exists but is soft-deleted, sign out and redirect to login with error
      if (existingProfile && existingProfile.deleted_at) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL("/auth/login?error=account_deleted", requestUrl.origin))
      }

      // Detect if this is a team invite — invited users have team_member_id in metadata
      const teamMemberId = data.user.user_metadata?.team_member_id
      const isTeamInvite = !!teamMemberId

      if (mode === "login" && !existingProfile && !isTeamInvite) {
        // Sign out the user
        await supabase.auth.signOut()

        // Delete the auto-created auth user using admin API
        await serviceSupabase.auth.admin.deleteUser(data.user.id)

        // Redirect to login with error
        return NextResponse.redirect(new URL("/auth/login?error=no_account", requestUrl.origin))
      }

      if (!existingProfile) {
        // Create profile for new user (OAuth signup or team invite)
        await serviceSupabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "",
          role: "user",
        })
      }

      // If user accepted a team invite, mark them as active
      if (teamMemberId) {
        await serviceSupabase
          .from("team_members")
          .update({ status: "active", joined_at: new Date().toISOString() })
          .eq("id", teamMemberId)
      }

      // If so, DON'T create any subscription - let oauth-checkout handle it
      const isGoingToCheckout = next.includes("/auth/oauth-checkout")

      if (!isGoingToCheckout) {
        // Only create Free subscription if NOT going to paid plan checkout
        const { data: existingSubscription } = await serviceSupabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", data.user.id)
          .single()

        if (!existingSubscription) {
          // Get Free plan
          const { data: freePlan } = await serviceSupabase
            .from("subscription_plans")
            .select("id")
            .eq("name", "Free")
            .eq("is_active", true)
            .single()

          if (freePlan) {
            // Get Free plan monthly price
            const { data: freePrice } = await serviceSupabase
              .from("subscription_prices")
              .select("id")
              .eq("plan_id", freePlan.id)
              .eq("billing_cycle", "monthly")
              .eq("is_active", true)
              .single()

            // Create subscription using service role to bypass RLS
            await serviceSupabase.from("user_subscriptions").insert({
              user_id: data.user.id,
              plan_id: freePlan.id,
              price_id: freePrice?.id,
              status: "active",
              started_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
            })
          }

          return NextResponse.redirect(new URL("/dashboard?welcome=true", requestUrl.origin))
        }
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // If there's an error or no code, redirect to login
  return NextResponse.redirect(new URL("/auth/login", requestUrl.origin))
}
