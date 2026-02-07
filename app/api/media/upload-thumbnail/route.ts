import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const mediaId = formData.get("mediaId") as string
    const thumbnailFile = formData.get("thumbnail") as File

    if (!mediaId || !thumbnailFile) {
      return NextResponse.json(
        { error: "Missing mediaId or thumbnail file" },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify media exists and belongs to user
    const { data: media, error: mediaError } = await supabase
      .from("media")
      .select("*")
      .eq("id", mediaId)
      .eq("user_id", user.id)
      .single()

    if (mediaError || !media) {
      return NextResponse.json(
        { error: "Media not found" },
        { status: 404 }
      )
    }

    // Validate image file
    if (!thumbnailFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      )
    }

    // Max 2MB for thumbnail
    if (thumbnailFile.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Thumbnail must be less than 2MB" },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const buffer = await thumbnailFile.arrayBuffer()
    const storagePath = `thumbnails/${user.id}/${mediaId}.jpg`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("media")
      .upload(storagePath, buffer, {
        upsert: true,
        contentType: thumbnailFile.type,
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("media").getPublicUrl(storagePath)

    // Update media record with thumbnail_path
    const { error: updateError } = await supabase
      .from("media")
      .update({ thumbnail_path: publicUrl })
      .eq("id", mediaId)
      .eq("user_id", user.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      thumbnail_path: publicUrl,
    })
  } catch (error) {
    console.error("[v0] Error uploading thumbnail:", error)
    return NextResponse.json(
      { error: "Failed to upload thumbnail" },
      { status: 500 }
    )
  }
}
