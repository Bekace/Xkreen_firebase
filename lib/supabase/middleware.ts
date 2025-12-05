import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, skip auth checks and continue
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  try {
    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: If you remove getUser() and you use server-side rendering
    // with the Supabase client, your users may be randomly logged out.
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/dashboard/admin-") ||
      request.nextUrl.pathname.startsWith("/dashboard/user-management") ||
      request.nextUrl.pathname.startsWith("/dashboard/plan-management") ||
      request.nextUrl.pathname.startsWith("/dashboard/feature-management")
    ) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }

      // Check if user has admin or superadmin role
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }
    }

    if (
      request.nextUrl.pathname !== "/" &&
      !user &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/player") &&
      !request.nextUrl.pathname.startsWith("/api/devices") &&
      !request.nextUrl.pathname.startsWith("/screen") &&
      !request.nextUrl.pathname.startsWith("/api/screens/config")
    ) {
      // no user, potentially respond by redirecting the user to the login page
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error("[v0] Supabase auth error in middleware:", error)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}
