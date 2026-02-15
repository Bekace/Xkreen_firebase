import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Resend the confirmation email
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    })

    if (error) {
      console.error("[v0] Resend verification error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: "Verification email resent successfully" })
  } catch (error) {
    console.error("[v0] Resend verification error:", error)
    return NextResponse.json({ error: "Failed to resend verification email" }, { status: 500 })
  }
}
