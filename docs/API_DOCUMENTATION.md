# Digital Signage Player API Documentation

## System Architecture Overview

The digital signage platform consists of three main components:
1. **Android TV App** (WebView-based player)
2. **Web Dashboard** (User management interface)
3. **Backend API** (Next.js API routes + Supabase PostgreSQL)

---

## Device Pairing & Lifecycle Flow

### 1. Device Registration Flow

```
Android TV App Launches
↓
Loads: https://v0-xkreen-ai.vercel.app/player?tv=true
↓
Generates 5-character Device Code (UPPERCASE + NUMBERS)
↓
Stores code in localStorage: "xkreen_device_code"
↓
Calls: POST /api/devices/register
↓
Device registered in database (unpaired state)
↓
Displays pairing screen with Device Code
↓
Polls every 2 seconds: GET /api/devices/status/[deviceCode]
```

### 2. User Pairing Flow (Dashboard)

```
User logs into dashboard
↓
Creates new Screen
↓
Enters Device Code from TV
↓
Calls: POST /api/devices/pair
↓
Database Updates:
  - devices.is_paired = true
  - devices.screen_id = [screen_id]
  - devices.user_id = [user_id]
↓
Status poll on TV detects pairing
↓
TV redirects to: /player/[deviceCode]
```

### 3. Player Operation Flow

```
Player page loads: /player/[deviceCode]
↓
Fetches config: GET /api/devices/config/[deviceCode]
↓
Receives:
  - Screen info (name, orientation)
  - Playlist data (if assigned)
  - Media items with URLs
↓
Starts media playback rotation
↓
Sends heartbeat every 30s: PUT /api/devices/heartbeat/[deviceCode]
↓
Polls for config updates every 30s
```

---

## API Endpoints Reference

### Device Management Endpoints

#### POST /api/devices/register
**Purpose:** Register a new device in the system

**Request Body:**
```json
{
  "device_code": "A3K7M",
  "device_info": {
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "url": "https://v0-xkreen-ai.vercel.app/player"
  }
}
```

**Response (201):**
```json
{
  "device": {
    "id": "uuid",
    "device_code": "A3K7M",
    "is_paired": false,
    "screen_id": null,
    "user_id": null,
    "last_heartbeat": "2024-01-15T10:30:00.000Z"
  }
}
```

**Logic:**
- Checks if device with code already exists
- If exists: updates `last_heartbeat` and returns existing device
- If new: inserts into `devices` table with `is_paired = false`
- Device code must be unique across the system

**Database Fields:**
```sql
devices (
  id UUID PRIMARY KEY,
  device_code VARCHAR UNIQUE,
  is_paired BOOLEAN DEFAULT false,
  screen_id UUID REFERENCES screens(id),
  user_id UUID REFERENCES profiles(id),
  device_info JSONB,
  last_heartbeat TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

#### POST /api/devices/pair
**Purpose:** Pair a device to a screen (requires authentication)

**Authentication:** Required (Supabase Auth)

**Request Body:**
```json
{
  "deviceCode": "A3K7M",
  "screenId": "uuid-of-screen"
}
```

**Response (200):**
```json
{
  "success": true,
  "screen": {
    "id": "uuid",
    "name": "Lobby Display",
    "orientation": "landscape"
  }
}
```

**Logic:**
1. Validates user authentication
2. Checks device exists and is not already claimed by another user
3. Validates screen belongs to authenticated user
4. Updates device record:
   ```sql
   UPDATE devices SET
     is_paired = true,
     screen_id = '[screenId]',
     user_id = '[userId]',
     last_heartbeat = NOW()
   WHERE device_code = '[deviceCode]'
   ```
5. Updates screen status to "online"

**Error Responses:**
- `401`: Authentication required
- `404`: Device not found or screen not found
- `400`: Missing deviceCode or screenId

---

#### GET /api/devices/status/[deviceCode]
**Purpose:** Check device pairing status (used by TV polling)

**Authentication:** Not required (anonymous access)

**Response (200):**
```json
{
  "device": {
    "id": "uuid",
    "device_code": "A3K7M",
    "is_paired": true,
    "screen_id": "uuid-of-screen",
    "last_heartbeat": "2024-01-15T10:35:00.000Z"
  }
}
```

**Headers:**
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**Logic:**
- Queries `devices` table by `device_code`
- Updates `last_heartbeat` timestamp
- Returns current pairing status
- **Critical for TV polling:** TV checks `is_paired` and `screen_id` to detect successful pairing

---

#### GET /api/devices/config/[deviceCode]
**Purpose:** Fetch complete configuration for player (screen + playlist + media)

**Authentication:** Not required (uses service role key)

**Response (200):**
```json
{
  "device": {
    "id": "uuid",
    "device_code": "A3K7M",
    "is_paired": true,
    "screen_id": "uuid"
  },
  "screen": {
    "id": "uuid",
    "name": "Lobby Display",
    "orientation": "landscape",
    "status": "online",
    "playlist": {
      "id": "uuid",
      "name": "Main Content",
      "background_color": "#000000",
      "is_active": true,
      "scale_image": "fit",
      "scale_video": "fit",
      "scale_document": "fit",
      "shuffle": false,
      "default_transition": "fade"
    },
    "content": [
      {
        "id": "playlist-item-uuid",
        "position": 1,
        "duration_override": 15,
        "transition_type": "fade",
        "transition_duration": 0.5,
        "media": {
          "id": "media-uuid",
          "name": "Welcome Banner",
          "file_path": "https://blob.vercel-storage.com/...",
          "mime_type": "image/png",
          "file_size": 1245680,
          "duration": 10
        }
      }
    ]
  }
}
```

**Content Types Supported:**
- **Images:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **Videos:** `video/mp4`, `video/webm`, `video/quicktime`
- **Documents:** `application/pdf`, Google Slides URLs
- **YouTube:** Embedded iframe URLs

**Logic Flow:**
1. Look up device by `device_code`
2. If device not paired → return `404`
3. Get screen associated with device
4. Check screen for **individual asset** (`media_id`):
   - If `media_id` exists: fetch single media item, create virtual playlist
5. If no asset, check for **active playlist**:
   - Query `screen_playlists` with `is_active = true`
   - Fetch playlist details from `playlists` table
   - Get all `playlist_items` ordered by `position`
   - Join with `media` table to get file paths
6. Update device `last_heartbeat`
7. Return complete config with no-cache headers

**Scale Settings:**
The playlist contains scale settings for each media type:
- `fit`: Maintain aspect ratio, fit within screen (letterbox/pillarbox)
- `fill`: Fill entire screen, crop if necessary
- `stretch`: Fill screen, ignore aspect ratio

---

#### PUT /api/devices/heartbeat/[deviceCode]
**Purpose:** Update device heartbeat and screen online status

**Authentication:** Not required (anonymous access for TV)

**Request:** No body required

**Response (200):**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:40:00.000Z"
}
```

**Logic:**
1. Find paired device by `device_code`
2. Update `devices.last_heartbeat = NOW()`
3. If device has `screen_id`:
   ```sql
   UPDATE screens SET
     last_seen = NOW(),
     status = 'online'
   WHERE id = '[screen_id]'
   ```

**Polling Frequency:** Every 30 seconds from player

**Status Management:**
- Device sends heartbeat → screen marked "online"
- If no heartbeat for 2+ minutes → dashboard can mark screen "offline"

---

## Device Code Generation Algorithm

**Implementation** (`app/player/page.tsx`):

```typescript
// Generate 5-character alphanumeric code
const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
let code = ""

// Random 5 characters
for (let i = 0; i < 5; i++) {
  code += characters.charAt(Math.floor(Math.random() * characters.length))
}

// Add timestamp suffix for uniqueness
const timestamp = Date.now().toString(36).toUpperCase()
code = (code + timestamp).substring(0, 5)

// Result: "A3K7M", "B9Q2X", etc.
```

**Characteristics:**
- **Length:** Exactly 5 characters
- **Characters:** Uppercase A-Z and 0-9 (36 possible characters)
- **Uniqueness:** Timestamp suffix ensures no collisions
- **Total combinations:** 36^5 = 60,466,176 possible codes
- **Storage:** localStorage on device (`xkreen_device_code`)

---

## Player Data Fetching Architecture

### Initial Load

```typescript
// 1. Player page component mounts
useEffect(() => {
  fetchConfig()
}, [deviceCode])

// 2. Fetch configuration
const fetchConfig = async () => {
  const response = await fetch(`/api/devices/config/${deviceCode}`)
  const data = await response.json()
  
  // 3. Extract playlist and content
  const playlist = data.screen.playlist
  const content = data.screen.content
  
  // 4. Apply shuffle if enabled
  if (playlist.shuffle) {
    content = shuffleArray(content)
  }
  
  // 5. Start playback
  setCurrentIndex(0)
  startRotation()
}
```

### Polling for Updates

```typescript
// Poll every 30 seconds for config changes
useEffect(() => {
  const interval = setInterval(() => {
    fetchConfig() // Re-fetch complete config
  }, 30000)
  
  return () => clearInterval(interval)
}, [deviceCode])
```

**Why Polling:**
- Simple implementation
- No WebSocket complexity
- Works reliably in Android WebView
- 30-second interval balances freshness vs. API load

**Alternative (Future):** Supabase Realtime subscriptions for instant updates

---

## Database Relationships

```
users (auth.users)
  ↓ (one-to-many)
profiles
  ↓ (one-to-many)
screens ←──┐
  ↓        │
screen_playlists  devices (paired to screen)
  ↓
playlists
  ↓
playlist_items
  ↓
media (files in Vercel Blob Storage)
```

**Key Relationships:**

1. **devices → screens** (many-to-one)
   - Multiple devices can point to same screen (redundancy)
   - Device stores `screen_id` foreign key

2. **screens → screen_playlists** (one-to-many)
   - Screen can have multiple playlists (scheduled)
   - Only one active playlist at a time (`is_active = true`)

3. **playlists → playlist_items** (one-to-many)
   - Ordered list of media items
   - `position` field determines playback order

4. **playlist_items → media** (many-to-one)
   - Same media can appear in multiple playlists
   - `duration_override` allows per-item timing

---

## Security & RLS Policies

### Devices Table RLS

```sql
-- Anonymous devices can self-register
CREATE POLICY "devices_insert_anonymous" ON devices
FOR INSERT TO anon
WITH CHECK (true);

-- Devices can update their own heartbeat
CREATE POLICY "Allow anonymous device heartbeat update" ON devices
FOR UPDATE TO anon
USING (device_code = device_code);

-- Users can claim unpaired devices
CREATE POLICY "Allow users to claim devices" ON devices
FOR UPDATE TO authenticated
USING (user_id IS NULL OR user_id = auth.uid());

-- Users can view their own devices
CREATE POLICY "Users can view their own devices" ON devices
FOR SELECT TO authenticated
USING (user_id = auth.uid());
```

**Key Points:**
- Anonymous (TV) access allowed for registration and heartbeat
- Users can only see/modify their own devices
- Service role bypasses RLS for config endpoint

---

## Player Polling Strategy

### Pairing Detection Polling

**Location:** `app/player/page.tsx`

```typescript
const startPairingPoll = (code: string) => {
  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/devices/status/${code}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    })
    
    const data = await response.json()
    
    if (data.device?.is_paired && data.device?.screen_id) {
      clearInterval(pollInterval)
      router.push(`/player/${code}`) // Navigate to player
    }
  }, 2000) // Every 2 seconds
  
  // Timeout after 10 minutes
  setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000)
}
```

**Characteristics:**
- **Frequency:** Every 2 seconds (fast detection)
- **Timeout:** 10 minutes (prevent infinite polling)
- **Cache prevention:** Headers force fresh data
- **Success condition:** `is_paired = true` AND `screen_id` exists

### Config Update Polling

**Location:** `app/player/[deviceCode]/page.tsx`

```typescript
useEffect(() => {
  // Initial fetch
  fetchConfig()
  
  // Poll every 30 seconds
  const configPoll = setInterval(fetchConfig, 30000)
  
  return () => clearInterval(configPoll)
}, [deviceCode])
```

**Characteristics:**
- **Frequency:** Every 30 seconds (balance freshness vs. load)
- **Triggers re-render:** Player updates when playlist changes
- **Heartbeat included:** Config endpoint updates `last_heartbeat`

---

## Media URL Structure

### Vercel Blob Storage

**Format:**
```
https://[account].public.blob.vercel-storage.com/[filename]-[hash].[ext]
```

**Example:**
```
https://xkreen.public.blob.vercel-storage.com/welcome-banner-a8f3d2c1.png
```

**Database Storage:**
```sql
media.file_path = 'https://xkreen.public.blob.vercel-storage.com/...'
```

### Google Slides

**Format:**
```
https://docs.google.com/presentation/d/[presentationId]/embed
```

**Player Rendering:**
```tsx
<iframe
  src={media.file_path}
  className="w-full h-full"
  allow="autoplay"
/>
```

### YouTube Videos

**Format:**
```
https://www.youtube.com/embed/[videoId]?autoplay=1
```

**Player Rendering:**
```tsx
<iframe
  src={media.file_path}
  className="w-full h-full"
  allow="autoplay; encrypted-media"
/>
```

---

## Error Handling

### Device Not Found (404)

**Response:**
```json
{
  "error": "Device not found"
}
```

**Player Behavior:**
- Show error screen: "Device not registered"
- Provide retry button
- Clear localStorage and regenerate code

### Device Not Paired (404)

**Response:**
```json
{
  "error": "Device not paired to screen"
}
```

**Player Behavior:**
- Continue showing pairing screen
- Keep polling for status updates

### No Content Assigned

**Response:** Empty `content` array

**Player Behavior:**
- Show: "No content assigned"
- Display message: "Assign content to this screen in your dashboard"
- Keep polling (content might be added later)

---

## Performance Considerations

### API Response Caching

**Config Endpoint:**
```typescript
const response = NextResponse.json(data)
response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
response.headers.set('Pragma', 'no-cache')
response.headers.set('Expires', '0')
return response
```

**Reason:** Ensures TV always gets fresh playlist data

### Database Query Optimization

```typescript
// Single query with joins for efficiency
const { data } = await supabase
  .from('playlist_items')
  .select(`
    id,
    position,
    duration_override,
    media (
      id,
      name,
      file_path,
      mime_type
    )
  `)
  .eq('playlist_id', playlistId)
  .order('position')
```

**Benefits:**
- Reduces round trips
- Supabase handles join optimization
- Returns denormalized data ready for player

---

## Developer Integration Examples

### Adding a New Device

```typescript
// Client-side (Android TV WebView)
const registerDevice = async (deviceCode: string) => {
  const response = await fetch('/api/devices/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_code: deviceCode,
      device_info: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    })
  })
  
  return await response.json()
}
```

### Pairing from Dashboard

```typescript
// Dashboard (authenticated)
const pairDevice = async (deviceCode: string, screenId: string) => {
  const response = await fetch('/api/devices/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceCode, screenId })
  })
  
  if (!response.ok) {
    throw new Error('Pairing failed')
  }
  
  return await response.json()
}
```

### Fetching Player Config

```typescript
// Player (no auth required)
const getPlayerConfig = async (deviceCode: string) => {
  const response = await fetch(`/api/devices/config/${deviceCode}`)
  
  if (response.status === 404) {
    return { error: 'Device not paired' }
  }
  
  const data = await response.json()
  return {
    playlist: data.screen.playlist,
    content: data.screen.content
  }
}
```

---

## Testing the API

### 1. Register a Device

```bash
curl -X POST https://v0-xkreen-ai.vercel.app/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_code": "TEST1",
    "device_info": {
      "userAgent": "TestClient/1.0",
      "timestamp": "2024-01-15T10:00:00.000Z"
    }
  }'
```

### 2. Check Device Status

```bash
curl https://v0-xkreen-ai.vercel.app/api/devices/status/TEST1
```

### 3. Pair Device (requires auth token)

```bash
curl -X POST https://v0-xkreen-ai.vercel.app/api/devices/pair \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{
    "deviceCode": "TEST1",
    "screenId": "your-screen-uuid"
  }'
```

### 4. Fetch Config

```bash
curl https://v0-xkreen-ai.vercel.app/api/devices/config/TEST1
```

---

## Common Issues & Troubleshooting

### Issue: Device keeps showing "Not paired" after pairing

**Cause:** Polling not detecting paired status

**Debug:**
1. Check device record in database: `SELECT * FROM devices WHERE device_code = 'CODE'`
2. Verify `is_paired = true` and `screen_id` is set
3. Check browser console for polling errors
4. Verify no caching is preventing fresh status

**Fix:** Clear localStorage and re-register device

---

### Issue: Player shows "No content assigned" but playlist exists

**Cause:** Playlist not marked as active or no items

**Debug:**
1. Check screen_playlists: `SELECT * FROM screen_playlists WHERE screen_id = 'ID' AND is_active = true`
2. Check playlist_items: `SELECT COUNT(*) FROM playlist_items WHERE playlist_id = 'ID'`
3. Verify media files exist: `SELECT * FROM media WHERE id IN (SELECT media_id FROM playlist_items WHERE playlist_id = 'ID')`

**Fix:** 
- Mark playlist as active in screen_playlists
- Add media items to playlist
- Ensure media.file_path URLs are accessible

---

### Issue: Heartbeat not updating screen status

**Cause:** Device not properly linked to screen

**Debug:**
1. Check device record: `SELECT device_code, screen_id FROM devices WHERE device_code = 'CODE'`
2. Verify screen_id is not NULL
3. Check API logs for heartbeat endpoint errors

**Fix:** Re-pair device to screen

---

## Player Architecture (Current Implementation)

### Dual-Element Strategy

The player uses a dual-element approach for seamless transitions:

**Video Elements:**
- Two `<video>` elements (A and B) alternate
- While video A plays, video B preloads next video
- When A ends, B instantly displays (already loaded)
- A then preloads the video after B
- Result: Zero black screens between videos

**iframe Elements (Google Slides, YouTube):**
- Two `<iframe>` elements (A and B) alternate
- Same preload-while-playing strategy
- Timer-based advancement (no native "ended" event)

**Images:**
- Single `<img>` element with timer
- Uses `Image.decode()` API for preloading
- More efficient than dual elements for static content

### Hooks Architecture

**`hooks/use-media-switcher.ts`**
- Manages which element (A or B) is currently active
- Handles crossfade transitions
- Tracks previous index for seamless switches

**`hooks/use-media-preloader.ts`**
- Preloads next media item based on type
- Different strategies per media type:
  - Videos: `element.load()` + `canplaythrough` event
  - Images: `Image.decode()` promise
  - iframes: `load` event listener
- 30-second timeout with retry logic
- Prevents redundant preloads

**`hooks/use-playlist-timer.ts`**
- Simple countdown timer for images and iframes
- 1-second interval ticks
- Advances when timer reaches 0
- Uses `useCallback` to prevent timer reset bug

### Key Implementation Details

**Timer Dependency Bug Prevention:**
```typescript
// CORRECT: Stable callback reference
const handleAdvance = useCallback(() => {
  setCurrentIndex(prev => (prev + 1) % content.length)
}, [content.length])

// WRONG: Creates new function on every render
const handleAdvance = () => {
  setCurrentIndex((currentIndex + 1) % content.length)
}
```

**Android WebView Optimizations:**
- Preload elements attached to DOM (not detached)
- Hardware acceleration enabled in MainActivity
- `crossOrigin="anonymous"` for CORS
- No viewport manipulation
- Let CSS handle scaling with `object-fit`

**Graceful Degradation:**
- If preload times out, extend current item duration
- Keep trying to load in background
- Never show black screen or stop playlist
- Always have something visible

---

This documentation provides a complete technical reference for developers working with the digital signage player system, covering API endpoints, authentication flows, data structures, player architecture, and troubleshooting procedures.
