# Xkreen — Digital Signage CMS Overview

## What It Is

Xkreen (formerly Pointer) is a cloud-based digital signage CMS that lets businesses upload media, build playlists, schedule content, and push it to physical or web-based screens in real time. It is a multi-tenant SaaS with subscription billing, role-based access, and a remote-paired screen player.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| UI | Tailwind CSS v4, shadcn/ui, Radix UI |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| File Storage | Google Cloud Storage (GCS) via REST API |
| Payments | Stripe (Checkout, Webhooks, Subscriptions) |
| Hosting | Firebase App Hosting |
| Auth | Supabase Auth (email/password, magic link) |

---

## Core Features

### Content Management
- **Media Library** — upload images, videos, and URL-based media to GCS; stored with metadata (name, mime type, file size, GCS path) in the `media` table
- **Playlists** — ordered collections of media items with per-item duration, transition type/duration, and shuffle support (`playlists` + `playlist_items`)
- **Schedules** — time-based rules that assign playlists to screens on a recurring basis (`schedules` + `schedule_items`)

### Screen Management
- **Screens** — each screen has a unique pairing code (e.g. `QNYZW`), resolution, orientation, and location assignment
- **Screen Pairing** — an Android player (or web browser at `/player/[deviceCode]`) displays a code; the user enters it in the dashboard to link the screen to their account
- **Content Assignment** — screens can be assigned a playlist or individual media directly; the player polls `/api/devices/config/[deviceCode]` to get its current content

### Web Player (`/player/[deviceCode]`)
- Runs in any browser (or embedded in Android WebView)
- Polls `/api/devices/config/[deviceCode]` every 30 seconds for content updates
- Plays images and videos in sequence with configurable durations and fade transitions
- Images/iframes use a countdown timer; videos use native `onEnded` to advance
- Dual-buffer A/B element switching for seamless transitions
- Sends `device_events` (heartbeat, proof-of-play) back to the API

### Android Player Integration
- The Android app opens a WebView pointing to `https://app.xkreen.com/player/[deviceCode]`
- The pairing code is either hardcoded in the app or displayed on first launch
- Config polling, content playback, and event reporting all happen through the same web APIs — no separate Android SDK required
- `device_events` table records heartbeat pings and play events used for analytics and "Last Seen" timestamps

### User Accounts & Multi-Tenancy
- Each user has a `profiles` row (display name, company, avatar stored in GCS, Stripe customer ID)
- All data is scoped by `user_id` with Row Level Security (RLS) enforced at the DB level
- **Team Members** — users can invite teammates (`team_members` table); role-based (owner/member)
- **Locations** — screens can be grouped by physical location (`locations`, `screen_locations`)

---

## Subscription & Billing

### Plans
Three tiers stored in `subscription_plans`: **Free**, **Pro**, **Enterprise**.  
All plans include **1 free screen**. Additional screens are **purchased slots at $6/month each**.

### How It Works
1. User selects a plan → Stripe Checkout session created
2. After payment → `checkout.session.completed` webhook fires → user account created (new signup) or subscription upgraded (existing user)
3. On upgrade, `purchased_screen_slots` incremented by 1 in `user_subscriptions`
4. Screen limit = `free_screens + purchased_screen_slots - current_screen_count`
5. Adding a screen beyond the limit triggers a Stripe Checkout for an additional slot

### Key Tables
| Table | Purpose |
|---|---|
| `subscription_plans` | Plan definitions (name, free_screens, max_screens) |
| `subscription_prices` | Stripe price IDs per plan/cycle |
| `user_subscriptions` | Active subscription per user (plan, status, purchased_screen_slots, Stripe IDs) |
| `pending_signups` | Temporary store for signups awaiting payment confirmation |

### Feature Permissions
`feature_permissions` maps `(plan_id, feature_key, is_enabled)` — controls which features are available per plan. Managed via the admin Feature Management page. Feature names are derived from `feature_key` (snake_case → Title Case). The public pricing page reads enabled features per plan from `/api/pricing/features`.

---

## Admin Panel (`/dashboard/admin/`)

Accessible only to super-admins (checked via `profiles.is_super_admin`). Includes:
- **User Management** — view all users, subscriptions, screen counts
- **Feature Management** — matrix of features × plans with toggle controls; add new features with per-plan enable/disable
- **Plan Management** — edit plan details and pricing
- **Audit Logs** — all admin actions logged to `admin_audit_logs`

---

## API Surface

| Endpoint | Purpose |
|---|---|
| `GET /api/devices/config/[deviceCode]` | Returns screen config + ordered content for the player |
| `POST /api/devices/pair` | Pairs a device code to a screen |
| `POST /api/devices/heartbeat` | Records device online status |
| `POST /api/media/upload` | Uploads file to GCS, saves metadata to DB |
| `GET/POST /api/playlists` | CRUD for playlists |
| `GET/POST /api/schedules` | CRUD for schedules |
| `GET/POST /api/screens` | CRUD for screens |
| `GET /api/screen-limits` | Returns available screen slots for current user |
| `POST /api/stripe/checkout` | Creates a Stripe Checkout session |
| `POST /api/stripe/add-screen` | Creates a Checkout session to purchase a screen slot |
| `POST /api/webhooks/stripe` | Handles Stripe events (subscription create/update/cancel) |
| `POST /api/profile/avatar` | Uploads avatar to GCS, saves URL to `profiles` |
| `PATCH /api/profile/change-password` | Re-authenticates then updates password via Supabase Auth |
| `GET /api/pricing/features` | Returns enabled features per plan for the public pricing page |
| `GET/POST /api/admin/features` | Admin CRUD for feature permissions |
| `PATCH /api/admin/features/permissions/[id]` | Toggle a single feature permission |

---

## Database Tables (25 total)

| Table | Description |
|---|---|
| `profiles` | User profile data, Stripe customer ID, avatar URL |
| `devices` | Paired devices with code, last seen, status |
| `device_events` | Heartbeat and proof-of-play events from players |
| `screens` | Screen definitions (name, orientation, resolution) |
| `screen_locations` | Many-to-many screens ↔ locations |
| `screen_media` | Direct media assignment to a screen |
| `screen_playlists` | Playlist assignment to a screen |
| `screen_schedules` | Schedule assignment to a screen |
| `media` | Media metadata (name, mime type, GCS file_path, size) |
| `playlists` | Playlist headers (name, shuffle, background color) |
| `playlist_items` | Ordered media items within a playlist |
| `schedules` | Schedule headers (name, recurrence rules) |
| `schedule_items` | Time slots within a schedule |
| `locations` | Physical location definitions |
| `analytics` | Aggregated analytics data per screen |
| `analytics_settings` | Per-user analytics configuration |
| `subscription_plans` | Plan tiers and screen limits |
| `subscription_prices` | Stripe price IDs per plan and billing cycle |
| `user_subscriptions` | Active subscription per user |
| `feature_permissions` | Feature enable/disable per plan |
| `pricing_features` | Feature display data for pricing page |
| `team_members` | Team membership and roles |
| `upload_settings` | Per-user upload preferences |
| `pending_signups` | Pre-payment signup data |
| `admin_audit_logs` | Admin action history |

---

## Auth Flow

1. **New user** → selects plan → pays via Stripe → webhook creates Supabase Auth user + profile + subscription → confirmation email sent
2. **Existing user login** → `supabase.auth.signInWithPassword` → session cookie → middleware validates on every request
3. **Password reset** → `/auth/forgot-password` sends reset email with link to `/auth/callback?next=/auth/reset-password` → Supabase exchanges code → user sets new password
4. **Password change** (in-app) → re-authenticates with current password first, then calls `supabase.auth.updateUser`

---

## File Storage (GCS)

All media and avatars are stored in Google Cloud Storage bucket `xkreen-web-app`. Files are uploaded server-side via the GCS XML API using a service account key (HMAC signing). Public URLs follow the pattern:
```
https://storage.googleapis.com/xkreen-web-app/[userId]/[timestamp]-[filename]
```
Avatar uploads go through `/api/profile/avatar` and the URL is saved to `profiles.avatar_url`.


## Prompts Initial


Read the readme.md file to get the full context, then give me your feedback on your understanding of the project.

I’ll speak to you in Spanish, but you must always respond in English and write code in English.

I want you to work without giving me explanations, apologizing, or praising anything I say. I only want you to tell me your approach, what you plan to do, and how you would solve a problem when I ask you to.

Do not remove anything without discussing it with me first. Do not take any action without my permission. Always show me the result of your investigation first, and then ask me whether you should proceed or not.

Read the code, investigate it, and give me your approach for solving it, making sure the change does not affect anything else.

I do not want you to keep apologizing. I do not need your apologies.

Do not write any code without my authorization. Do not remove anything without my authorization.

I do not want speed when it comes to writing code. I want accuracy, not speed.