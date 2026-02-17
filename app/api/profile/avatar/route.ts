import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { uploadToGCS } from "@/lib/gcs/rest-client"
import { Buffer } from "buffer"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    console.log("[v0] Uploading avatar for user:", user.id)
    console.log("[v0] File name:", file.name, "Size:", file.size, "Type:", file.type)

    // Upload to Google Cloud Storage
    const bucketName = process.env.GCS_BUCKET_NAME || "xkreen-web-app"
    const filename = `avatars/${user.id}/${Date.now()}-${file.name}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const publicUrl = await uploadToGCS(bucketName, filename, buffer, file.type)

    console.log("[v0] Avatar uploaded to:", publicUrl)

    // Update profile with avatar URL
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Failed to update profile with avatar:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("[v0] Profile updated with avatar URL")
    return NextResponse.json({ success: true, url: publicUrl, profile: data })
  } catch (error) {
    console.error("[v0] Avatar upload exception:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload avatar" },
      { status: 500 }
    )
  }
}
