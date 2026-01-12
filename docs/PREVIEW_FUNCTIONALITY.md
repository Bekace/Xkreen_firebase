# Preview Functionality Technical Documentation

## Overview

The preview functionality allows users to preview playlists and screens in the dashboard before deploying them to physical displays. The preview system uses a modal-based player that replicates the exact behavior of the Android TV player, including support for images, videos, YouTube videos, Google Slides presentations, and PDFs.

---

## Architecture

### Component Location

**Primary Component:** `PlaylistPreviewModal` in `app/dashboard/playlists/page.tsx`

**Related Components:**
- `ScreenPreviewModal` in `components/screen-preview-modal.tsx` (screens preview)
- Player page at `app/player/[deviceCode]/page.tsx` (actual TV player)

---

## Google Slides Handling

### Detection Logic

Google Slides content is identified through three methods:

\`\`\`typescript
const isGoogleSlides = (media: { mime_type?: string; file_path?: string }) => {
  return (
    media.mime_type === "application/vnd.google-apps.presentation" ||
    media.file_path?.includes("docs.google.com/presentation") ||
    media.file_path?.includes("slides.google")
  )
}
\`\`\`

**Detection Methods:**
1. **MIME Type Check:** `application/vnd.google-apps.presentation`
2. **URL Pattern Match:** Contains `docs.google.com/presentation`
3. **Alternative Domain:** Contains `slides.google`

---

### URL Transformation

Google Slides URLs must be converted to embed format for iframe rendering:

\`\`\`typescript
const getGoogleSlidesEmbedUrl = (url: string) => {
  // If already in embed format, return as-is
  if (url.includes("/embed")) {
    return url
  }
  
  // Convert edit/view URLs to embed format
  return url
    .replace("/edit", "/embed")
    .replace("/view", "/embed")
}
\`\`\`

**URL Formats Supported:**

**Input (Edit URL):**
\`\`\`
https://docs.google.com/presentation/d/[PRESENTATION_ID]/edit
\`\`\`

**Input (View URL):**
\`\`\`
https://docs.google.com/presentation/d/[PRESENTATION_ID]/view
\`\`\`

**Output (Embed URL):**
\`\`\`
https://docs.google.com/presentation/d/[PRESENTATION_ID]/embed
\`\`\`

**Additional Parameters (from API route):**
\`\`\`
/embed?start=false&loop=false&delayms=3000
\`\`\`

- `start=false`: Don't auto-start slideshow
- `loop=false`: Don't loop presentation
- `delayms=3000`: 3-second delay between slides (if auto-advance enabled)

---

### Rendering in Preview

Google Slides are rendered using an iframe element:

\`\`\`tsx
if (isGoogleSlides(item.media)) {
  const embedUrl = getGoogleSlidesEmbedUrl(item.media.file_path)
  
  return (
    <div className="relative w-full h-full overflow-hidden">
      <iframe
        src={embedUrl}
        style={mediaStyle}
        className="w-full h-full border-0"
        allowFullScreen
        title={item.media.name}
      />
    </div>
  )
}
\`\`\`

**Key Attributes:**
- **`src`**: Embed URL with presentation ID
- **`style`**: Applied transition styles (opacity, transform)
- **`className`**: Full width/height, no border
- **`allowFullScreen`**: Enables fullscreen presentation mode
- **`title`**: Accessibility label with media name

---

## Preview Modal State Management

### State Variables

\`\`\`typescript
const [items, setItems] = useState<PlaylistItem[]>([])           // Playlist media items
const [currentIndex, setCurrentIndex] = useState(0)              // Current item index
const [isPlaying, setIsPlaying] = useState(false)                // Auto-play state
const [timeRemaining, setTimeRemaining] = useState(0)            // Countdown timer (seconds)
const [loading, setLoading] = useState(false)                    // Loading state
const [volume, setVolume] = useState(1)                          // Video volume (0-1)
const [playbackSpeed, setPlaybackSpeed] = useState(1)            // Video speed (0.5-2x)
const [isFullscreen, setIsFullscreen] = useState(false)          // Fullscreen mode
const [autoLoop, setAutoLoop] = useState(true)                   // Loop playlist
const [isTransitioning, setIsTransitioning] = useState(false)    // Transition in progress
\`\`\`

---

## Data Fetching Flow

### 1. Modal Opens

\`\`\`typescript
useEffect(() => {
  if (isOpen && playlist) {
    console.log("[v0] Fetching items for playlist:", playlist.name)
    fetchPlaylistItems()
  } else {
    // Reset state when closed
    setCurrentIndex(0)
    setIsPlaying(false)
    setTimeRemaining(0)
    setItems([])
    setIsFullscreen(false)
  }
}, [isOpen, playlist])
\`\`\`

**Trigger:** Modal `isOpen` prop changes to `true`

**Action:** Fetch playlist items from API

**Cleanup:** Reset all state when modal closes

---

### 2. Fetch Playlist Items

\`\`\`typescript
const fetchPlaylistItems = async () => {
  if (!playlist) {
    console.log("[v0] Cannot fetch items: playlist is null")
    return
  }

  setLoading(true)
  try {
    console.log("[v0] Fetching playlist items for ID:", playlist.id)
    
    // API call to get complete playlist data
    const response = await fetch(`/api/playlists/${playlist.id}`)
    
    if (response.ok) {
      const data = await response.json()
      
      // Sort by position field (1, 2, 3, etc.)
      const sortedItems = data.playlist.playlist_items
        ?.sort((a: PlaylistItem, b: PlaylistItem) => a.position - b.position) || []
      
      console.log("[v0] Loaded playlist items:", sortedItems.length)
      
      // Set items and initialize playback
      setItems(sortedItems)
      setCurrentIndex(0)
      setTimeRemaining(sortedItems[0]?.duration_override || 10)
    }
  } catch (error) {
    console.error("Error fetching playlist items:", error)
  } finally {
    setLoading(false)
  }
}
\`\`\`

**API Endpoint:** `GET /api/playlists/[playlistId]`

**Response Structure:**
\`\`\`json
{
  "playlist": {
    "id": "uuid",
    "name": "Playlist Name",
    "playlist_items": [
      {
        "id": "item-uuid",
        "position": 1,
        "duration_override": 15,
        "transition_type": "fade",
        "transition_duration": 0.8,
        "media": {
          "id": "media-uuid",
          "name": "Media Name",
          "file_path": "https://...",
          "mime_type": "application/vnd.google-apps.presentation"
        }
      }
    ]
  }
}
\`\`\`

**Key Fields:**
- **`position`**: Determines display order (critical for sorting)
- **`duration_override`**: Custom duration for this item (overrides default)
- **`transition_type`**: Animation effect (fade, slide, etc.)
- **`transition_duration`**: Animation time in seconds
- **`media.file_path`**: URL to media (Blob Storage, Google Slides, YouTube)

---

### 3. Auto-Start Playback

\`\`\`typescript
useEffect(() => {
  if (items.length > 0 && !isPlaying) {
    console.log("[v0] Auto-starting playlist playback")
    setIsPlaying(true)
  }
}, [items, isPlaying])
\`\`\`

**Trigger:** Items loaded successfully

**Action:** Automatically set `isPlaying = true`

**Result:** Timer starts countdown

---

## Rotation Timer Logic

### Simple Countdown Implementation

\`\`\`typescript
useEffect(() => {
  // Only run if playing and time remaining
  if (isPlaying && timeRemaining > 0) {
    console.log("[v0] Timer running, time remaining:", timeRemaining)
    
    // Decrement every 1 second
    const timer = setTimeout(() => {
      console.log("[v0] Timer tick, new time:", timeRemaining - 1)
      setTimeRemaining((prev) => prev - 1)
    }, 1000)
    
    // Cleanup on unmount or dependency change
    return () => clearTimeout(timer)
    
  } else if (isPlaying && timeRemaining === 0) {
    // Timer reached zero, advance to next item
    console.log("[v0] Timer finished, calling goToNext")
    goToNext()
  }
}, [isPlaying, timeRemaining, goToNext])
\`\`\`

**Timer Behavior:**

1. **Initial State:** `timeRemaining` set to `duration_override` (or 10 seconds default)
2. **Every Second:** Decrement `timeRemaining` by 1
3. **Reaches Zero:** Call `goToNext()` to advance playlist
4. **Paused:** Timer stops when `isPlaying = false`

**Key Feature:** Uses `setTimeout` instead of `setInterval` for better cleanup and dependency handling

---

## Advancement Logic

### goToNext Function

\`\`\`typescript
const goToNext = useCallback(() => {
  console.log("[v0] goToNext called, currentIndex:", currentIndex, "total items:", items.length)

  // Safety check
  if (items.length === 0) {
    console.log("[v0] No items to advance to")
    return
  }

  // Calculate next index (with loop support)
  const nextIndex = currentIndex + 1 < items.length 
    ? currentIndex + 1 
    : autoLoop ? 0 : currentIndex

  // End of playlist without loop
  if (nextIndex === currentIndex && !autoLoop) {
    console.log("[v0] Reached end of playlist, stopping")
    setIsPlaying(false)
    return
  }

  // Get next item's transition settings
  const nextItem = items[nextIndex]
  const transitionType = nextItem?.transition_type || "fade"
  const transitionDuration = nextItem?.transition_duration || 0.8

  console.log("[v0] Applying transition:", transitionType, "duration:", transitionDuration)

  // Apply transition
  setIsTransitioning(true)

  // Advance after transition completes
  setTimeout(() => {
    setCurrentIndex(nextIndex)
    setTimeRemaining(nextItem?.duration_override || 10)
    setIsTransitioning(false)
    console.log("[v0] Advanced to item", nextIndex + 1, "of", items.length)
  }, transitionDuration * 1000)
  
}, [currentIndex, items, autoLoop])
\`\`\`

**Flow Diagram:**

\`\`\`
Timer reaches 0
↓
goToNext() called
↓
Calculate nextIndex (with loop check)
↓
Get transition settings from next item
↓
setIsTransitioning(true) → Apply CSS opacity/transform
↓
Wait for transition duration (0.8s default)
↓
setTimeout callback fires:
  - setCurrentIndex(nextIndex)
  - setTimeRemaining(new duration)
  - setIsTransitioning(false)
↓
Timer restarts with new duration
\`\`\`

---

## Google Slides Duration Handling

### Default Duration

**For Google Slides:** Uses `duration_override` from playlist item

\`\`\`typescript
setTimeRemaining(nextItem?.duration_override || 10)
\`\`\`

**Default:** 10 seconds if no override specified

**Why Timer-Based:**
- Google Slides iframes have no "onEnded" event
- Unlike videos, presentations don't signal completion
- User must specify desired display duration

---

### Duration Override

Users can set custom durations per playlist item:

**Database Field:**
\`\`\`sql
playlist_items.duration_override INT -- Seconds to display item
\`\`\`

**Example Values:**
- `15`: Display Google Slides for 15 seconds
- `30`: Display for 30 seconds
- `NULL`: Use default (10 seconds)

**Use Cases:**
- Short announcements: 5-10 seconds
- Detailed presentations: 30-60 seconds
- Long-form content: 120+ seconds

---

## Transition System

### Transition State

\`\`\`typescript
const [isTransitioning, setIsTransitioning] = useState(false)
\`\`\`

**Purpose:** Signals when media is changing (applies CSS animations)

---

### Transition Styles

\`\`\`typescript
const getTransitionStyles = (isTransitioning: boolean) => {
  return {
    opacity: isTransitioning ? 0 : 1,
    transform: isTransitioning ? "scale(0.95)" : "scale(1)",
    transition: "opacity 0.8s ease, transform 0.8s ease",
  }
}
\`\`\`

**Applied Styles:**
- **Opacity:** Fades out (0) during transition, fades in (1) when stable
- **Transform:** Slight scale down during transition (visual polish)
- **Transition Duration:** 0.8 seconds default (customizable per item)

**CSS Effect:** Smooth cross-fade between items

---

### Transition Types Supported

**Database Field:**
\`\`\`sql
playlist_items.transition_type VARCHAR -- Animation name
playlist_items.transition_duration FLOAT -- Seconds for transition
\`\`\`

**Supported Types:**
- `fade`: Opacity transition (default)
- `slide`: Slide in from side
- `zoom`: Scale up/down
- `none`: Instant cut (0s duration)

**Current Implementation:** Only `fade` is fully implemented in preview

---

## Media Type Rendering Priority

The preview checks media types in this order:

### 1. YouTube Videos

\`\`\`typescript
if (isYouTubeVideo(item.media)) {
  const embedUrl = getYouTubeUrlWithAutoplay(item.media.file_path)
  return <iframe src={embedUrl} ... />
}
\`\`\`

**Detection:** URL contains `youtube.com` or `youtu.be`

---

### 2. Google Slides

\`\`\`typescript
if (isGoogleSlides(item.media)) {
  const embedUrl = getGoogleSlidesEmbedUrl(item.media.file_path)
  return <iframe src={embedUrl} ... />
}
\`\`\`

**Detection:** URL contains `docs.google.com/presentation` OR mime type is `application/vnd.google-apps.presentation`

---

### 3. Images

\`\`\`typescript
if (item.media.mime_type?.startsWith("image/")) {
  return <img src={item.media.file_path || "/placeholder.svg"} style={mediaStyle} alt={item.media.name} />
}
\`\`\`

**MIME Types:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`

---

### 4. Videos

\`\`\`typescript
if (item.media.mime_type?.startsWith("video/")) {
  return (
    <video 
      src={item.media.file_path} 
      style={mediaStyle} 
      autoPlay 
      muted={volume === 0} 
      onEnded={goToNext} 
    />
  )
}
\`\`\`

**MIME Types:** `video/mp4`, `video/webm`, `video/quicktime`

**Key Difference:** Videos have `onEnded` event that calls `goToNext()` automatically (bypasses timer)

---

### 5. Unsupported Types

\`\`\`typescript
return (
  <div style={mediaStyle} className="flex items-center justify-center bg-gray-100 text-gray-500">
    <p>Unsupported media type</p>
  </div>
)
\`\`\`

---

## Google Slides Import Flow

### API Endpoint

**Location:** `app/api/media/import-url/route.ts`

### Detection

\`\`\`typescript
function isGoogleSlidesUrl(url: string): boolean {
  return url.includes("docs.google.com/presentation")
}
\`\`\`

### ID Extraction

\`\`\`typescript
function extractGoogleSlidesId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}
\`\`\`

**Example:**
\`\`\`
URL: https://docs.google.com/presentation/d/1abc-XYZ_123/edit
ID: 1abc-XYZ_123
\`\`\`

### Embed URL Generation

\`\`\`typescript
function getGoogleSlidesEmbedUrl(id: string): string {
  return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`
}
\`\`\`

### Database Storage

\`\`\`sql
INSERT INTO media (
  name,
  file_path,
  mime_type,
  file_size,
  user_id
) VALUES (
  'Google Slides - 1abc-XYZ',
  'https://docs.google.com/presentation/d/1abc-XYZ_123/embed?start=false&loop=false&delayms=3000',
  'application/vnd.google-apps.presentation',
  0, -- No file size (external URL)
  'user-uuid'
)
\`\`\`

**Key Points:**
- `file_path`: Stores full embed URL (not edit URL)
- `file_size`: Set to 0 (external content, not in Blob Storage)
- `mime_type`: Special Google Apps MIME type

---

## Preview vs. Player Differences

### Similarities

Both preview and player share:
- ✅ Same rotation timer logic (1-second countdown)
- ✅ Same Google Slides detection (`isGoogleSlides`)
- ✅ Same embed URL transformation (`getGoogleSlidesEmbedUrl`)
- ✅ Same rendering (iframe with full width/height)
- ✅ Same duration handling (`duration_override` or 10s default)

### Differences

| Feature | Preview (Dashboard) | Player (Android TV) |
|---------|---------------------|---------------------|
| **Location** | Modal in browser | Full-screen WebView |
| **Controls** | Play/Pause, Volume, Speed | None (auto-play only) |
| **Navigation** | Previous/Next buttons | Auto-advance only |
| **Fullscreen** | Optional (button) | Always fullscreen |
| **Polling** | No polling (static data) | Polls config every 30s |
| **Preloading** | No preloading | Dual-element preloading |
| **Purpose** | User preview/testing | Production playback |

---

## Why Preview Works Reliably

### 1. Simple Timer Implementation

\`\`\`typescript
useEffect(() => {
  if (isPlaying && timeRemaining > 0) {
    const timer = setTimeout(() => {
      setTimeRemaining((prev) => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  } else if (isPlaying && timeRemaining === 0) {
    goToNext()
  }
}, [isPlaying, timeRemaining, goToNext])
\`\`\`

**Why it works:**
- **Single dependency:** Only `goToNext` function in deps (wrapped in `useCallback`)
- **No function recreation:** `goToNext` is stable (doesn't change on every render)
- **Clean timeout:** `clearTimeout` in cleanup prevents memory leaks
- **Predictable:** Timer always decrements, no complex logic

---

### 2. Stable goToNext Function

\`\`\`typescript
const goToNext = useCallback(() => {
  // Advancement logic
}, [currentIndex, items, autoLoop])
\`\`\`

**Dependencies:**
- `currentIndex`: Changes only when advancing
- `items`: Changes only on initial load
- `autoLoop`: Rarely changes (user setting)

**Result:** Function doesn't recreate on every render, timer doesn't reset

---

### 3. No Preloading Complexity

**Preview doesn't preload:**
- No dual-element system
- No readyQueue state
- No timeout tracking
- No WebView event issues

**Just-in-time loading:**
- Item loads when `currentIndex` changes
- Browser handles caching naturally
- iframe preloads automatically in background

---

### 4. Browser Environment

**Running in Chrome/Safari:**
- Reliable iframe `onLoad` events
- Fast DOM rendering
- Proper event firing
- Good caching mechanisms

**Not affected by:**
- Android WebView quirks
- Hardware acceleration issues
- Touch event conflicts
- Native app memory constraints

---

## Google Slides Specific Considerations

### Slide Auto-Advance

**Embed URL Parameter:** `delayms=3000`

**Behavior:**
- If user enables auto-advance in Google Slides settings
- Slides advance every 3 seconds automatically
- **Independent of playlist timer**

**Conflict Scenario:**
\`\`\`
Playlist duration: 15 seconds
Google Slides auto-advance: 3 seconds per slide

Result: 
- Slides change at 3s, 6s, 9s, 12s (internal to iframe)
- Playlist advances at 15s (controlled by timer)
- User sees 5 slides before next playlist item
\`\`\`

**Recommendation:** Disable auto-advance in Google Slides for predictable timing

---

### Presentation Permissions

**Public Presentations:**
- Work immediately in preview/player
- No authentication required

**Private Presentations:**
- May show "Request access" screen
- User must set sharing to "Anyone with the link"
- Or embed from publicly shared Drive folder

**Error Handling:**
- iframe displays Google's error UI
- No way to detect permission errors in code
- User must manually verify permissions

---

### Aspect Ratio

**Google Slides Default:** 16:9 or 4:3 (user-configured)

**Preview/Player Handling:**
\`\`\`css
iframe {
  width: 100%;
  height: 100%;
}
\`\`\`

**Behavior:**
- iframe fills entire preview window
- Google Slides maintains internal aspect ratio
- May show letterboxing/pillarboxing if ratios don't match

---

## Debugging Google Slides Issues

### Issue: Slides Not Loading

**Check:**
1. Inspect iframe `src` attribute - should be `/embed` URL
2. Open embed URL directly in browser - check permissions
3. Verify presentation ID is correct (alphanumeric + hyphens)
4. Check browser console for CSP (Content Security Policy) errors

**Fix:**
\`\`\`typescript
// Verify URL transformation
console.log("[v0] Original URL:", item.media.file_path)
const embedUrl = getGoogleSlidesEmbedUrl(item.media.file_path)
console.log("[v0] Embed URL:", embedUrl)
\`\`\`

---

### Issue: Preview Advances Too Quickly

**Check:**
1. `duration_override` value in database
2. Google Slides auto-advance setting

**Fix:**
\`\`\`sql
-- Update duration for specific item
UPDATE playlist_items 
SET duration_override = 30 
WHERE id = 'item-uuid';
\`\`\`

---

### Issue: Slides Show "Request Access"

**Check:**
1. Presentation sharing settings in Google Drive
2. URL contains presentation ID (not folder ID)

**Fix:**
1. Open presentation in Google Slides
2. Click "Share" button
3. Set to "Anyone with the link can view"
4. Re-import URL in dashboard

---

## Performance Considerations

### iframe Rendering

**Browser Optimization:**
- Browser caches iframe content
- Subsequent loads faster
- iframe exists in DOM during entire preview session

**Memory Usage:**
- Each iframe holds entire Google Slides app in memory
- Multiple slides = multiple iframes (if dual-element used)
- **Recommendation:** Preview uses single iframe, not dual-element

---

### Network Requests

**Initial Load:**
\`\`\`
User opens preview
↓
Fetch /api/playlists/[id] (gets playlist items)
↓
For each Google Slides item:
  - Browser requests https://docs.google.com/presentation/...
  - Google serves slides app + presentation data
  - Additional requests for images/fonts in slides
\`\`\`

**Subsequent Items:**
- iframe `src` changes
- Browser may use cached Google Slides app
- Only presentation-specific data re-fetched

---

## Testing Checklist

### Google Slides in Preview

- [ ] Public presentation loads correctly
- [ ] Edit URL converts to embed URL
- [ ] Duration override respected
- [ ] Transitions apply smoothly
- [ ] Auto-advance disabled (or set to desired delay)
- [ ] Fullscreen mode works
- [ ] Next/Previous navigation functional
- [ ] Timer countdown accurate

### Edge Cases

- [ ] Private presentation shows appropriate error
- [ ] Invalid presentation ID handled gracefully
- [ ] Empty playlist (no items) doesn't crash
- [ ] Single-item playlist loops correctly
- [ ] Very long duration (120s+) works
- [ ] Very short duration (2s) works
- [ ] Rapid next/previous clicking handled

---

## Future Enhancements

### Potential Improvements

1. **Slide Progress Indicator:**
   - Show which slide within presentation is current
   - Requires Google Slides API integration

2. **Thumbnail Preview:**
   - Generate thumbnail from first slide
   - Store in database for quick playlist view

3. **Presentation Validation:**
   - Check permissions before adding to playlist
   - API call to verify public access

4. **Slide Count Detection:**
   - Calculate total slides
   - Auto-set duration (e.g., 3s per slide)

5. **Advanced Transitions:**
   - Custom animations between presentation changes
   - Zoom in/out effects specific to slides

---

## Related Documentation

- **API Documentation:** `docs/API_DOCUMENTATION.md`
- **Player Implementation:** `app/player/[deviceCode]/page.tsx`
- **Media Import API:** `app/api/media/import-url/route.ts`
- **Playlist API:** `app/api/playlists/[id]/route.ts`

---

## Summary

The preview functionality provides a reliable, browser-based simulation of the Android TV player experience. Google Slides are treated as timer-based media items, rendered via iframes with proper embed URL transformation. The simple countdown timer and stable state management ensure smooth rotation through playlist items without the complexity of preloading or WebView-specific optimizations required in the production player.

**Key Takeaway:** The preview works because it uses simple, browser-native features (setTimeout, iframes) without attempting to optimize for Android TV constraints. This makes it an ideal reference implementation when debugging player issues.
