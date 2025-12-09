import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const tagsString = formData.get("tags") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const tags = tagsString ? JSON.parse(tagsString) : []
    const fileName = `${user.id}/${Date.now()}-${file.name}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from("media").upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadError) {
      console.error("[v0] Supabase storage upload error:", uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("media").getPublicUrl(fileName)

    // Save to database
    const { data: mediaData, error: mediaError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: file.name,
        file_path: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        tags: tags,
      })
      .select()
      .single()

    if (mediaError) {
      console.error("[v0] Database insert error:", mediaError)
      // Try to delete the uploaded file
      await supabase.storage.from("media").remove([fileName])
      return NextResponse.json({ error: `Failed to save media: ${mediaError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      media: mediaData,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}
