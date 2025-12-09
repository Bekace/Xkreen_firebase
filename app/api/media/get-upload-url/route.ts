import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { generateSignedUploadUrl } from "@/lib/gcs/rest-client"

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

    const { fileName, fileSize, fileType } = await request.json()

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get upload settings
    const { data: uploadSettingsArray } = await supabase.from("upload_settings").select("*").limit(1)
    const uploadSettings = uploadSettingsArray?.[0] || null

    // Get user's subscription plan limits
    const { data: userData } = await supabase
      .from("profiles")
      .select(`
        *,
        user_subscriptions!inner(
          status,
          subscription_plans(max_media_storage, max_file_size)
        )
      `)
      .eq("id", user.id)
      .single()

    // Determine max file size
    let maxFileSize = 500 * 1024 * 1024 // Default 500MB
    if (uploadSettings?.enforce_globally && uploadSettings.max_file_size) {
      maxFileSize = uploadSettings.max_file_size
    } else if (userData?.user_subscriptions?.subscription_plans?.max_file_size) {
      maxFileSize = userData.user_subscriptions.subscription_plans.max_file_size
    }

    // Validate file size
    if (fileSize > maxFileSize) {
      const maxMB = Math.round(maxFileSize / (1024 * 1024))
      const fileMB = (fileSize / (1024 * 1024)).toFixed(2)
      return NextResponse.json(
        { error: `File size (${fileMB} MB) exceeds the maximum of ${maxMB} MB.` },
        { status: 413 },
      )
    }

    // Check storage limit
    const maxStorage = userData?.user_subscriptions?.subscription_plans?.max_media_storage || 1024 * 1024 * 1024
    const isUnlimited = maxStorage === -1

    if (!isUnlimited) {
      const { data: mediaData } = await supabase.from("media").select("file_size").eq("user_id", user.id)
      const currentStorage = mediaData?.reduce((t, i) => t + (i.file_size || 0), 0) || 0

      if (currentStorage + fileSize > maxStorage) {
        const remainingGB = Math.max(0, (maxStorage - currentStorage) / (1024 * 1024 * 1024))
        return NextResponse.json(
          { error: `Storage limit exceeded. You have ${remainingGB.toFixed(2)} GB remaining.` },
          { status: 413 },
        )
      }
    }

    const bucketName = process.env.GCS_BUCKET_NAME || "xkreen-web-app"
    const gcsFileName = `${user.id}/${Date.now()}-${fileName}`

    console.log("[v0] Generating signed URL for:", gcsFileName)

    const uploadUrl = await generateSignedUploadUrl(bucketName, gcsFileName, fileType)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`

    console.log("[v0] Generated signed URL successfully")

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      gcsFileName,
      bucketName,
    })
  } catch (error) {
    console.error("[v0] Get upload URL error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate upload URL" },
      { status: 500 },
    )
  }
}
