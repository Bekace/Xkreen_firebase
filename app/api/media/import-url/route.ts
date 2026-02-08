import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Helper functions for URL validation and processing
function isGoogleSlidesUrl(url: string): boolean {
  return url.includes("docs.google.com/presentation")
}

function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com/watch") || url.includes("youtu.be/")
}

function extractGoogleSlidesId(url: string): string | null {
  const patterns = [/https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)/]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

function extractYouTubeId(url: string): string | null {
  // Handle youtube.com/watch?v=VIDEO_ID
  const youtubeMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/)
  if (youtubeMatch) {
    return youtubeMatch[1]
  }

  // Handle youtu.be/VIDEO_ID
  const youtubeShortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  if (youtubeShortMatch) {
    return youtubeShortMatch[1]
  }

  return null
}

function getGoogleSlidesEmbedUrl(id: string): string {
  return `https://docs.google.com/presentation/d/${id}/embed?start=true&loop=false&delayms=3000&rm=minimal`
}

function getYouTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&rel=0&modestbranding=1&controls=0&showinfo=0&fs=0&iv_load_policy=3`
}

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

    const body = await request.json()
    const { url, tags, name } = body

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    let mediaType: string
    let embedUrl: string
    let mediaName: string
    const fileSize = 0 // External URLs don't count toward storage

    // Detect and process Google Slides
    if (isGoogleSlidesUrl(url)) {
      const slidesId = extractGoogleSlidesId(url)
      if (!slidesId) {
        return NextResponse.json({ error: "Invalid Google Slides URL" }, { status: 400 })
      }

      embedUrl = getGoogleSlidesEmbedUrl(slidesId)
      mediaType = "application/vnd.google-apps.presentation"
      mediaName = name || `Google Slides - ${slidesId.substring(0, 8)}`
    }
    // Detect and process YouTube
    else if (isYouTubeUrl(url)) {
      const videoId = extractYouTubeId(url)
      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
      }

      embedUrl = getYouTubeEmbedUrl(videoId)
      mediaType = "video/youtube"
      mediaName = name || `YouTube Video - ${videoId}`
    }
    // Unsupported URL type
    else {
      return NextResponse.json(
        { error: "Unsupported URL. Please provide a Google Slides or YouTube URL." },
        { status: 400 },
      )
    }

    // Save metadata to Supabase
    const { data: insertedMediaData, error: dbError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: mediaName,
        file_path: embedUrl,
        original_url: url, // Save original URL for reference
        file_size: fileSize,
        mime_type: mediaType,
        embed_status: 'pending', // Will be updated by player if fallback is needed
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map((tag: string) => tag.trim())) : [],
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save media metadata" }, { status: 500 })
    }

    return NextResponse.json({
      id: insertedMediaData.id,
      name: mediaName,
      mime_type: mediaType,
      file_size: fileSize,
      file_path: embedUrl,
      tags: insertedMediaData.tags,
      created_at: insertedMediaData.created_at,
    })
  } catch (error) {
    console.error("Import URL error:", error)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}
