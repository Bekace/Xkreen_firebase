# Proof of Play & Analytics — xkreen CMS

---

## 1. Proof of Play

### Concept

Proof of Play (PoP) is the mechanism by which a screen player **reports back to the server every time a piece of media actually plays**. It answers the question: *"Was this content actually shown, and for how long?"* This is critical for verifying ad delivery, content scheduling compliance, and reporting to clients.

In xkreen, PoP is implemented via **device events** — structured log entries that the player (web or Android) posts to the server at key moments during playback.

---

### How It Works

1. **Player triggers an event** — When a media item starts or finishes playing, the player POSTs an event to `/api/devices/events`.
2. **Server writes to `device_events`** — The API authenticates the device by its `device_code`, resolves its `device_id`, and inserts a row.
3. **Stats are queried** — The dashboard reads `/api/proof-of-play/stats` to aggregate totals per media item, screen, or time range.

---

### Database Table: `device_events`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `device_id` | uuid | FK → `devices.id` |
| `event_type` | varchar | `media_start`, `media_end`, `media_skip`, `screen_online`, `screen_offline` |
| `media_id` | uuid | FK → `media.id` — which asset played |
| `playlist_id` | uuid | FK → `playlists.id` — which playlist was active |
| `metadata` | jsonb | Free-form payload (duration played, position, resolution, etc.) |
| `created_at` | timestamptz | UTC timestamp of the event |

---

### API Endpoints

#### `POST /api/devices/events`
Called by the player. No user auth required — device is identified by `device_code` in the request body.

**Request body:**
```json
{
  "device_code": "QNYZW",
  "event_type": "media_end",
  "media_id": "uuid...",
  "playlist_id": "uuid...",
  "metadata": { "duration_played": 10, "completed": true }
}
```

**Flow:**
- Look up `devices` by `device_code` → get `device_id`
- Insert row into `device_events`
- Returns `{ success: true }`

---

#### `GET /api/proof-of-play/stats`
Called by the dashboard. Requires user auth (Supabase session).

**Query params:** `screen_id`, `media_id`, `start_date`, `end_date`

**Returns:**
```json
{
  "total_plays": 142,
  "total_duration": 1420,
  "by_media": [
    { "media_id": "...", "name": "kypotx-1.jpg", "plays": 60, "duration": 600 }
  ],
  "by_screen": [...],
  "by_day": [...]
}
```

**Flow:**
- Filters `device_events` by `event_type = 'media_end'` (completed plays)
- Joins with `devices` to scope to the authenticated user's screens
- Groups and aggregates by media, screen, and date

---

### Player Responsibilities

The web player (`/app/player/[deviceCode]/page.tsx`) fires events:
- `media_start` — when `autoPlay` begins (or image timer starts)
- `media_end` — via the video `onEnded` callback, or when the image timer expires and `advanceToNext()` fires

The Android player is expected to implement the same `POST /api/devices/events` contract.

---

---

## 2. Analytics

### Concept

Analytics in xkreen is a **higher-level, audience-facing layer** built on top of device events. While Proof of Play tracks *what played*, Analytics tracks *who saw it* — using optional camera-based audience detection (via `process-frame`) and configurable privacy/consent controls per screen.

Analytics is a **feature-gated** capability (`analytics` and `ai_analytics` feature keys in `feature_permissions`).

---

### How It Works

1. **Settings per screen** — each screen has a row in `analytics_settings` controlling whether collection is on, sampling rate, privacy mode, consent requirement, and data retention.
2. **Event ingestion** — generic audience or engagement events are written to the `analytics` table.
3. **AI frame processing** — if enabled, the player can POST camera frames to `/api/analytics/process-frame`, which runs audience detection (age range, gender estimate, attention time) and writes results back to `analytics`.
4. **Dashboard reads** — `/api/analytics/overview` and `/api/analytics/data` aggregate and return metrics for the dashboard.

---

### Database Tables

#### `analytics`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `screen_id` | uuid | FK → `screens.id` |
| `media_id` | uuid | FK → `media.id` (optional) |
| `event_type` | text | `impression`, `view`, `audience_detected`, `attention`, etc. |
| `event_data` | jsonb | Flexible payload — audience demographics, dwell time, frame metadata |
| `created_at` | timestamptz | UTC timestamp |

#### `analytics_settings`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `screen_id` | uuid | FK → `screens.id` |
| `user_id` | uuid | FK → `auth.users.id` |
| `enabled` | boolean | Master on/off switch |
| `retention_days` | integer | How long raw events are kept (default 90) |
| `consent_required` | boolean | Whether viewer consent UI must be shown |
| `sampling_rate` | integer | % of impressions to actually record (1–100) |
| `privacy_mode` | boolean | When true, no PII or face data is stored |
| `created_at` / `updated_at` | timestamptz | Audit timestamps |

---

### API Endpoints

#### `GET /api/analytics/overview`
Returns aggregated stats for the authenticated user's screens.

**Query params:** `screen_id`, `start_date`, `end_date`

**Returns:**
```json
{
  "total_impressions": 3200,
  "unique_viewers": 840,
  "avg_attention_seconds": 4.2,
  "top_media": [...],
  "by_day": [...]
}
```

---

#### `GET /api/analytics/data`
Returns raw or grouped event rows for charting — used by the analytics dashboard page.

---

#### `POST /api/analytics/process-frame`
Called by the player (web or Android) when AI audience detection is active.

**Request:** `multipart/form-data` with a camera frame image + `screen_id`.

**Flow:**
- Check `analytics_settings` for the screen — abort if `enabled = false` or `privacy_mode = true`
- Apply `sampling_rate` — skip randomly if below threshold
- Run audience detection model (age range, attention, count)
- Write result row to `analytics` with `event_type = 'audience_detected'` and demographics in `event_data`

---

#### `GET/PATCH /api/analytics/settings`
Reads or updates `analytics_settings` for a given screen. Used by the dashboard settings UI.

---

### Feature Gating

| Feature Key | Plans | Description |
|---|---|---|
| `analytics` | Pro, Enterprise | Basic impression/play analytics |
| `ai_analytics` | Enterprise only | Camera-based audience detection via `process-frame` |

Access is checked via `feature_permissions` before any analytics data is returned or written.

---

### Relationship Between PoP and Analytics

```
Player
  │
  ├─► POST /api/devices/events      →  device_events   (Proof of Play)
  │       media_start / media_end
  │
  └─► POST /api/analytics/process-frame  →  analytics  (Audience Analytics)
            camera frame (if AI enabled)
```

Both systems are **independent** — PoP is always available (all plans), Analytics is feature-gated. The dashboard can correlate both: e.g. "this media played 100 times (PoP) and was seen by ~240 people (Analytics)."
