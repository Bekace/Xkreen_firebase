-- Remove display/playback settings from playlists table
-- These settings now belong to screens only
-- is_active is kept as it's used internally by screen_playlists junction table

ALTER TABLE playlists
DROP COLUMN IF EXISTS shuffle,
DROP COLUMN IF EXISTS scale_image,
DROP COLUMN IF EXISTS scale_video,
DROP COLUMN IF EXISTS scale_document,
DROP COLUMN IF EXISTS background_color,
DROP COLUMN IF EXISTS default_transition;

-- Keep: id, user_id, name, description, is_active, created_at, updated_at
-- is_active is used by screen_playlists to track which playlist is currently active on a screen

COMMENT ON COLUMN playlists.is_active IS 'Internal flag used by screen_playlists junction table. Not a user-facing setting.';
