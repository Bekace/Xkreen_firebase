import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    // Allow unauthenticated requests from player
    // The player might not have user auth but needs to update status
    const body = await request.json()
    const { mediaId, embedUrl, embedStatus } = body

    if (!mediaId || !embedUrl || !embedStatus) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log('[v0] Updating embed status for media:', mediaId, 'to:', embedStatus)

    // Update the media record
    const { error: updateError } = await supabase
      .from("media")
      .update({
        file_path: embedUrl,
        embed_status: embedStatus,
      })
      .eq('id', mediaId)

    if (updateError) {
      console.error('[v0] Database update error:', updateError)
      return NextResponse.json({ error: "Failed to update media" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Update embed status error:', error)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}
