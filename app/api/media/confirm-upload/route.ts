import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { makeFilePublic } from "@/lib/gcs/rest-client"

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

    const { fileName, fileSize, fileType, publicUrl, gcsFileName, bucketName, tags } = await request.json()

    if (!fileName || !fileSize || !publicUrl || !gcsFileName || !bucketName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Confirm upload - file accessibility via bucket IAM:", { gcsFileName, bucketName })

    try {
      await makeFilePublic(bucketName, gcsFileName)
      console.log("[v0] File accessibility confirmed")
    } catch (error) {
      console.error("[v0] File accessibility check failed:", error)
      return NextResponse.json(
        {
          error: `Failed to confirm file accessibility: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 },
      )
    }

    // Save metadata to database
    const { data: mediaData, error: dbError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: fileName,
        file_path: publicUrl,
        file_size: fileSize,
        mime_type: fileType,
        tags: tags ? (typeof tags === "string" ? tags.split(",").map((t: string) => t.trim()) : tags) : [],
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({ error: "Failed to save media metadata" }, { status: 500 })
    }

    return NextResponse.json({
      id: mediaData.id,
      name: fileName,
      mime_type: fileType,
      file_size: fileSize,
      file_path: publicUrl,
      tags: mediaData.tags,
      created_at: mediaData.created_at,
    })
  } catch (error) {
    console.error("[v0] Confirm upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm upload" },
      { status: 500 },
    )
  }
}
