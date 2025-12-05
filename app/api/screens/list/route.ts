import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    const { data: screens, error } = await supabase
      .from("screens")
      .select("id, name, location")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching screens:", error)
      return NextResponse.json({ error: "Failed to fetch screens" }, { status: 500 })
    }

    return NextResponse.json({ screens })
  } catch (error) {
    console.error("Error in screens list API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
