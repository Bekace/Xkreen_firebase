"use client"

import { useEffect, useRef, useState, forwardRef } from "react"

interface YouTubePlayerProps {
  videoUrl: string
  mediaId: string
  mediaName: string
  isActive: boolean
  onVideoEnd?: () => void
  className?: string
}

// Extract video ID from various YouTube URL formats
function extractYouTubeId(url: string): string | null {
  try {
    // Handle embed URLs
    if (url.includes('/embed/')) {
      const match = url.match(/\/embed\/([a-zA-Z0-9_-]+)/)
      return match ? match[1] : null
    }
    // Handle watch URLs
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url)
      return urlObj.searchParams.get('v')
    }
    // Handle youtu.be URLs
    if (url.includes('youtu.be/')) {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
      return match ? match[1] : null
    }
    return null
  } catch (error) {
    console.error('[v0] Error extracting YouTube ID:', error)
    return null
  }
}

// Build YouTube embed URL with different parameter sets
function buildYouTubeUrl(videoId: string, level: 'restrictive' | 'moderate' | 'permissive'): string {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`
  
  switch (level) {
    case 'restrictive':
      // For digital signage - hide all controls
      return `${base}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&fs=0&disablekb=1&playsinline=1&enablejsapi=1`
    case 'moderate':
      // Remove problematic parameters
      return `${base}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
    case 'permissive':
      // Minimal parameters - shows controls
      return `${base}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0&playsinline=1&enablejsapi=1`
    default:
      return `${base}?autoplay=1&mute=1&playsinline=1&enablejsapi=1`
  }
}

const YouTubePlayerWithFallback = forwardRef<HTMLIFrameElement, YouTubePlayerProps>(
  ({ videoUrl, mediaId, mediaName, isActive, onVideoEnd, className }, ref) => {
    const [currentUrl, setCurrentUrl] = useState<string>('')
    const [fallbackLevel, setFallbackLevel] = useState<'restrictive' | 'moderate' | 'permissive'>('restrictive')
    const [hasError, setHasError] = useState(false)
    const [updateAttempted, setUpdateAttempted] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const errorCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
      const videoId = extractYouTubeId(videoUrl)
      if (!videoId) {
        console.error('[v0] Failed to extract video ID from:', videoUrl)
        setCurrentUrl(videoUrl) // Use original URL as fallback
        return
      }

      // Start with restrictive URL
      const restrictiveUrl = buildYouTubeUrl(videoId, fallbackLevel)
      setCurrentUrl(restrictiveUrl)
      console.log('[v0] Loading YouTube video with level:', fallbackLevel, 'URL:', restrictiveUrl)

      // Set up error detection timeout (3 seconds)
      // If iframe doesn't load properly, YouTube will show error message
      errorCheckTimeoutRef.current = setTimeout(() => {
        // Check if we should try fallback
        if (!hasError && fallbackLevel === 'restrictive') {
          console.log('[v0] Attempting moderate fallback for video:', videoId)
          setFallbackLevel('moderate')
        } else if (!hasError && fallbackLevel === 'moderate') {
          console.log('[v0] Attempting permissive fallback for video:', videoId)
          setFallbackLevel('permissive')
        }
      }, 5000)

      return () => {
        if (errorCheckTimeoutRef.current) {
          clearTimeout(errorCheckTimeoutRef.current)
        }
      }
    }, [videoUrl, fallbackLevel, hasError])

    // Update database when fallback is used
    useEffect(() => {
      if (fallbackLevel !== 'restrictive' && !updateAttempted && isActive) {
        setUpdateAttempted(true)
        
        // Update the database with the fallback configuration
        const updateDatabase = async () => {
          try {
            const videoId = extractYouTubeId(videoUrl)
            if (!videoId) return

            const newUrl = buildYouTubeUrl(videoId, fallbackLevel)
            const status = fallbackLevel === 'permissive' ? 'fallback_permissive' : 'fallback_moderate'

            console.log('[v0] Updating database with fallback:', fallbackLevel, 'for media:', mediaId)

            await fetch('/api/media/update-embed-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mediaId,
                embedUrl: newUrl,
                embedStatus: status,
              }),
            })
          } catch (error) {
            console.error('[v0] Failed to update embed status:', error)
          }
        }

        updateDatabase()
      }
    }, [fallbackLevel, mediaId, videoUrl, updateAttempted, isActive])

    // Listen for YouTube Player API messages
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        // Only accept messages from YouTube
        if (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com')) {
          return
        }

        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          
          // YouTube Player API event
          if (data.event === 'onStateChange') {
            console.log('[v0] YouTube player state change:', data.info)
            
            // Video ended (state 0)
            if (data.info === 0 && onVideoEnd) {
              onVideoEnd()
            }
          }

          // Error event
          if (data.event === 'onError') {
            console.error('[v0] YouTube player error:', data.info)
            setHasError(true)
            
            // Try fallback on error
            if (fallbackLevel === 'restrictive') {
              setFallbackLevel('moderate')
            } else if (fallbackLevel === 'moderate') {
              setFallbackLevel('permissive')
            }
          }
        } catch (error) {
          // Ignore parse errors from other sources
        }
      }

      window.addEventListener('message', handleMessage)
      return () => window.removeEventListener('message', handleMessage)
    }, [fallbackLevel, onVideoEnd])

    return (
      <iframe
        ref={ref}
        src={currentUrl}
        className={className}
        allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        title={mediaName}
      />
    )
  }
)

YouTubePlayerWithFallback.displayName = 'YouTubePlayerWithFallback'

export default YouTubePlayerWithFallback
