"use client"

import { useEffect, useRef, useState, forwardRef } from "react"
import { trackEvent } from "@/lib/analytics";
import { useParams } from 'next/navigation';

interface YouTubePlayerProps {
  videoUrl: string;
  isActive: boolean;
  onVideoEnd?: () => void;
  className?: string;
  media: any; // Contiene toda la información, incluyendo id y name
  playlist: any;
}

// ... (las funciones extractYouTubeId y buildYouTubeUrl no cambian) ...
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
    console.error('[v0] Error extracting YouTube ID:', error)
    return null
  }
}

function buildYouTubeUrl(videoId: string, level: 'restrictive' | 'moderate' | 'permissive'): string {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`
  const params = `?autoplay=1&mute=1&playsinline=1&enablejsapi=1`;

  switch (level) {
    case 'restrictive':
      return `${base}${params}&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&disablekb=1`
    case 'moderate':
      return `${base}${params}&loop=1&playlist=${videoId}&rel=0&modestbranding=1&disablekb=1`
    case 'permissive':
      return `${base}${params}&loop=1&playlist=${videoId}&rel=0`
    default:
      return `${base}${params}`
  }
}

const YouTubePlayerWithFallback = forwardRef<HTMLIFrameElement, YouTubePlayerProps>(
  ({ videoUrl, isActive, onVideoEnd, className, media, playlist }, ref) => {
    const params = useParams();
    const deviceCode = params.deviceCode as string;
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [fallbackLevel, setFallbackLevel] = useState<'restrictive' | 'moderate' | 'permissive'>('restrictive');
    const [hasError, setHasError] = useState(false);
    const [updateAttempted, setUpdateAttempted] = useState(false);
    const hasTrackedStart = useRef(false);

    // Derivamos mediaId y mediaName del objeto media
    const mediaId = media?.media?.id;
    const mediaName = media?.media?.name;

    useEffect(() => {
      const videoId = extractYouTubeId(videoUrl);
      if (!videoId) {
        console.error('[v0] Failed to extract video ID from:', videoUrl);
        setCurrentUrl(videoUrl);
        return;
      }
      const newUrl = buildYouTubeUrl(videoId, fallbackLevel);
      setCurrentUrl(newUrl);
      console.log('[v0] Loading YouTube video with level:', fallbackLevel, 'URL:', newUrl);
    }, [videoUrl, fallbackLevel, hasError]);

    useEffect(() => {
      if (fallbackLevel !== 'restrictive' && !updateAttempted && isActive) {
        setUpdateAttempted(true);
        const updateDatabase = async () => {
          try {
            const videoId = extractYouTubeId(videoUrl);
            if (!videoId || !mediaId) return;

            const newUrl = buildYouTubeUrl(videoId, fallbackLevel);
            const status = fallbackLevel === 'permissive' ? 'fallback_permissive' : 'fallback_moderate';

            console.log('[v0] Updating database with fallback:', fallbackLevel, 'for media:', mediaId);

            await fetch('/api/media/update-embed-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mediaId: mediaId, // Usar el mediaId derivado
                embedUrl: newUrl,
                embedStatus: status,
              }),
            });
          } catch (error) {
            console.error('[v0] Failed to update embed status:', error);
          }
        };
        updateDatabase();
      }
    }, [fallbackLevel, mediaId, videoUrl, updateAttempted, isActive]);

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com')) {
          return;
        }
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.event === 'onStateChange' && isActive) {
            if (data.info === 1 && !hasTrackedStart.current) {
              console.log(`[Analytics] YouTube media_start for ${mediaId}`);
              trackEvent(deviceCode, 'media_start', media, playlist);
              hasTrackedStart.current = true;
            }
            if (data.info === 0) {
              console.log(`[Analytics] YouTube media_end for ${mediaId}`);
              trackEvent(deviceCode, 'media_end', media, playlist);
              hasTrackedStart.current = false;
              if (onVideoEnd) onVideoEnd();
            }
          }
          if (data.event === 'onError') {
            console.error('[v0] YouTube player error:', data.info);
            trackEvent(deviceCode, 'media_error', media, playlist, { error_code: data.info });
            setHasError(true);
          }
        } catch (error) {
          // Ignorar errores
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [isActive, deviceCode, media, playlist, onVideoEnd, mediaId]);

    return (
      <iframe
        ref={ref}
        src={currentUrl}
        className={className}
        allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        title={mediaName || 'YouTube Player'}
      />
    );
  }
);

YouTubePlayerWithFallback.displayName = 'YouTubePlayerWithFallback';

export default YouTubePlayerWithFallback;
