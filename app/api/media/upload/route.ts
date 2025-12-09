import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { uploadToGCS } from "@/lib/gcs/rest-client"
import { Buffer } from "buffer"

const VERCEL_BLOB_SIZE_LIMIT = 4.5 * 1024 * 1024 // 4.5 MB for free tier

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Upload route - Starting request processing")

    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log("[v0] Authentication failed:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    const formData = await request.formData()
    const file = formData.get("file") as File
    const tags = formData.get("tags") as string

    if (!file) {
      console.log("[v0] No file provided in request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] Upload attempt - File:", file.name, "Size:", file.size, "Type:", file.type)

    const { data: uploadSettingsArray } = await supabase.from("upload_settings").select("*").limit(1)
    const uploadSettings = uploadSettingsArray && uploadSettingsArray.length > 0 ? uploadSettingsArray[0] : null

    if (!uploadSettings) {
      console.log("[v0] No upload settings configured, using defaults")
    } else {
      console.log("[v0] Upload settings loaded:", {
        enforce_globally: uploadSettings.enforce_globally,
        max_file_size: uploadSettings.max_file_size,
      })
    }

    // Get user's storage limits
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select(`
        *,
        user_subscriptions!inner(
          status,
          subscription_plans(
            max_media_storage,
            max_file_size
          )
        )
      `)
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error("[v0] User data error:", userError)
      return NextResponse.json({ error: "Failed to fetch user subscription data" }, { status: 500 })
    }

    let maxFileSize: number
    if (uploadSettings?.enforce_globally && uploadSettings.max_file_size) {
      maxFileSize = uploadSettings.max_file_size
      console.log("[v0] Using global max file size:", maxFileSize)
    } else if (userData?.user_subscriptions?.subscription_plans?.max_file_size) {
      maxFileSize = userData.user_subscriptions.subscription_plans.max_file_size
      console.log("[v0] Using plan max file size:", maxFileSize)
    } else {
      maxFileSize = 10 * 1024 * 1024 // Default 10MB
      console.log("[v0] Using default max file size:", maxFileSize)
    }

    const maxStorageBytes =
      userData?.user_subscriptions?.subscription_plans?.max_media_storage || 1 * 1024 * 1024 * 1024

    console.log("[v0] Storage limits - Max file size:", maxFileSize, "Max storage:", maxStorageBytes)

    if (file.size > maxFileSize) {
      const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024))
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      console.log("[v0] File too large:", fileSizeMB, "MB exceeds", maxFileSizeMB, "MB")
      return NextResponse.json(
        {
          error: `File size (${fileSizeMB} MB) exceeds the maximum file size of ${maxFileSizeMB} MB.`,
        },
        { status: 413 },
      )
    }

    const isUnlimited = maxStorageBytes === -1
    const maxStorageGB = isUnlimited ? -1 : Math.round(maxStorageBytes / (1024 * 1024 * 1024))

    // Calculate current storage usage
    const { data: mediaData, error: mediaError } = await supabase
      .from("media")
      .select("file_size")
      .eq("user_id", user.id)

    if (mediaError) {
      console.error("[v0] Media data error:", mediaError)
      return NextResponse.json({ error: "Failed to check storage usage" }, { status: 500 })
    }

    const currentStorageBytes = mediaData?.reduce((total, item) => total + (item.file_size || 0), 0) || 0

    if (!isUnlimited && currentStorageBytes + file.size > maxStorageBytes) {
      const remainingGB = Math.max(0, (maxStorageBytes - currentStorageBytes) / (1024 * 1024 * 1024))
      console.log("[v0] Storage exceeded - Remaining:", remainingGB, "GB")
      return NextResponse.json(
        {
          error: `Storage limit exceeded. You have ${remainingGB.toFixed(2)} GB remaining of your ${maxStorageGB} GB limit.`,
        },
        { status: 413 },
      )
    }

    const allowedTypes = uploadSettings?.allowed_file_types || [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/webm",
      "video/x-msvideo",
      "application/pdf",
    ]

    if (!allowedTypes.includes(file.type)) {
      console.log("[v0] Unsupported file type:", file.type)
      return NextResponse.json(
        {
          error: `File type "${file.type}" is not supported. Allowed types: ${allowedTypes.join(", ")}`,
        },
        { status: 400 },
      )
    }

    console.log("[v0] Validation passed, uploading to Google Cloud Storage...")

    let publicUrl: string
    try {
      const bucketName = process.env.GCS_BUCKET_NAME || "xkreen-web-app"
      const filename = `${user.id}/${Date.now()}-${file.name}`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      console.log("[v0] Uploading file to GCS:", filename, "Size:", buffer.length)

      publicUrl = await uploadToGCS(bucketName, filename, buffer, file.type)

      console.log("[v0] GCS upload successful:", publicUrl)
    } catch (storageError: any) {
      console.error("[v0] Google Cloud Storage upload failed:", storageError)
      console.error("[v0] Error details:", {
        message: storageError.message,
        stack: storageError.stack,
      })
      return NextResponse.json(
        {
          error: `Storage upload failed: ${storageError.message || "Unknown error"}`,
        },
        { status: 500 },
      )
    }

    // Save metadata to Supabase
    const { data: insertedMediaData, error: dbError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: file.name,
        file_path: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({ error: "Failed to save media metadata" }, { status: 500 })
    }

    console.log("[v0] Upload complete:", insertedMediaData.id)

    return NextResponse.json({
      id: insertedMediaData.id,
      name: file.name,
      mime_type: file.type,
      file_size: file.size,
      file_path: publicUrl,
      tags: insertedMediaData.tags,
      created_at: insertedMediaData.created_at,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
