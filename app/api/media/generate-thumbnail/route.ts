import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"

export async function POST(request: NextRequest) {
  try {
    const { mediaId, fileUrl } = await request.json()

    if (!mediaId || !fileUrl) {
      return NextResponse.json(
        { error: "Missing mediaId or fileUrl" },
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

    // Get media item
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

    // Check if ffmpeg is available
    try {
      execSync("which ffmpeg", { stdio: "ignore" })
    } catch {
      return NextResponse.json(
        { error: "Video processing not available on this server" },
        { status: 503 }
      )
    }

    // Create temporary file for thumbnail
    const tempDir = os.tmpdir()
    const tempFileName = `thumb-${mediaId}-${Date.now()}.jpg`
    const tempFilePath = path.join(tempDir, tempFileName)

    try {
      // Generate thumbnail at 2 seconds
      execSync(
        `ffmpeg -i "${fileUrl}" -ss 2 -vframes 1 -vf "scale=320:180" "${tempFilePath}" -y 2>/dev/null`,
        { stdio: "pipe" }
      )

      // Read the thumbnail file
      const thumbnailBuffer = fs.readFileSync(tempFilePath)

      // Upload to Supabase Storage
      const storagePath = `thumbnails/${user.id}/${mediaId}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("media")
        .upload(storagePath, thumbnailBuffer, {
          upsert: true,
          contentType: "image/jpeg",
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

      // Clean up temp file
      fs.unlinkSync(tempFilePath)

      return NextResponse.json({
        success: true,
        thumbnail_path: publicUrl,
      })
    } finally {
      // Ensure temp file is cleaned up
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
    }
  } catch (error) {
    console.error("[v0] Error generating thumbnail:", error)
    return NextResponse.json(
      { error: "Failed to generate thumbnail" },
      { status: 500 }
    )
  }
}
