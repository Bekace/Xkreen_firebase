import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Extract video ID from various YouTube URL formats
function extractYouTubeId(url: string): string | null {
  try {
    if (url.includes('/embed/')) {
      const match = url.match(/\/embed\/([a-zA-Z0-9_-]+)/)
      return match ? match[1] : null
    }
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url)
      return urlObj.searchParams.get('v')
    }
    if (url.includes('youtu.be/')) {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
      return match ? match[1] : null
    }
    return null
  } catch (error) {
    console.error('Error extracting YouTube ID:', error)
    return null
  }
}

// Build YouTube embed URL with different parameter sets
function buildYouTubeUrl(videoId: string, level: 'restrictive' | 'moderate' | 'permissive'): string {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`
  
  switch (level) {
    case 'restrictive':
      return `${base}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&fs=0&disablekb=1&playsinline=1&enablejsapi=1`
    case 'moderate':
      return `${base}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
    case 'permissive':
      return `${base}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0&playsinline=1&enablejsapi=1`
    default:
      return `${base}?autoplay=1&mute=1&playsinline=1&enablejsapi=1`
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const body = await request.json()
    const { mediaId, preferredLevel } = body

    if (!mediaId) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 })
    }

    // Fetch the media record
    const { data: media, error: fetchError } = await supabase
      .from("media")
      .select("id, file_path, original_url, embed_status")
      .eq('id', mediaId)
      .single()

    if (fetchError || !media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    // Extract video ID
    const videoId = extractYouTubeId(media.file_path || media.original_url)
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
    }

    // Determine which level to use
    const level = preferredLevel || 'restrictive'
    const newEmbedUrl = buildYouTubeUrl(videoId, level)

    // Update the media record
    const { error: updateError } = await supabase
      .from("media")
      .update({
        file_path: newEmbedUrl,
        embed_status: level === 'restrictive' ? 'working' : `fallback_${level}`,
      })
      .eq('id', mediaId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ error: "Failed to update media" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      videoId,
      embedUrl: newEmbedUrl,
      level,
      availableLevels: [
        {
          level: 'restrictive',
          url: buildYouTubeUrl(videoId, 'restrictive'),
          description: 'No controls, best for digital signage (may fail on some videos)'
        },
        {
          level: 'moderate',
          url: buildYouTubeUrl(videoId, 'moderate'),
          description: 'No controls but more compatible'
        },
        {
          level: 'permissive',
          url: buildYouTubeUrl(videoId, 'permissive'),
          description: 'With controls, maximum compatibility'
        }
      ]
    })
  } catch (error) {
    console.error('Validate YouTube error:', error)
    return NextResponse.json({ error: "Validation failed" }, { status: 500 })
  }
}
