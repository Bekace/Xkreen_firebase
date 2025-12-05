import { put } from "@vercel/blob"
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
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const tags = formData.get("tags") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Get user's storage limits
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select(`
        *,
        user_subscriptions!inner(
          status,
          subscription_plans(
            max_media_storage
          )
        )
      `)
      .eq("id", user.id)
      .single()

    const maxStorageBytes =
      userData?.user_subscriptions?.subscription_plans?.max_media_storage || 1 * 1024 * 1024 * 1024
    const isUnlimited = maxStorageBytes === -1
    const maxStorageGB = isUnlimited ? -1 : Math.round(maxStorageBytes / (1024 * 1024 * 1024))

    // Calculate current storage usage
    const { data: mediaData, error: mediaError } = await supabase
      .from("media")
      .select("file_size")
      .eq("user_id", user.id)

    if (mediaError) {
      console.error("Media data error:", mediaError)
      return NextResponse.json({ error: "Failed to check storage usage" }, { status: 500 })
    }

    const currentStorageBytes = mediaData?.reduce((total, item) => total + (item.file_size || 0), 0) || 0

    if (!isUnlimited && currentStorageBytes + file.size > maxStorageBytes) {
      const remainingGB = Math.max(0, (maxStorageBytes - currentStorageBytes) / (1024 * 1024 * 1024))
      return NextResponse.json(
        {
          error: `Storage limit exceeded. You have ${remainingGB.toFixed(2)} GB remaining of your ${maxStorageGB} GB limit.`,
        },
        { status: 413 },
      )
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not supported" }, { status: 400 })
    }

    // Upload to Vercel Blob with organized path
    const filename = `${user.id}/${Date.now()}-${file.name}`
    const blob = await put(filename, file, {
      access: "public",
    })

    // Save metadata to Supabase
    const { data: insertedMediaData, error: dbError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: file.name,
        file_path: blob.url,
        file_size: file.size,
        mime_type: file.type,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save media metadata" }, { status: 500 })
    }

    return NextResponse.json({
      id: insertedMediaData.id,
      name: file.name,
      mime_type: file.type,
      file_size: file.size,
      file_path: blob.url,
      tags: insertedMediaData.tags,
      created_at: insertedMediaData.created_at,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
