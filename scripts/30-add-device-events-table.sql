-- Migration: Add device_events table for proof of play tracking
-- This table tracks all media playback events from Android devices

-- Create device_events table
CREATE TABLE IF NOT EXISTS device_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'media_start', 'media_end', 'media_error'
  media_id UUID REFERENCES media(id) ON DELETE SET NULL,
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  metadata JSONB, -- Additional event data (duration, position, error details, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_device_events_device_id ON device_events(device_id);
CREATE INDEX IF NOT EXISTS idx_device_events_event_type ON device_events(event_type);
CREATE INDEX IF NOT EXISTS idx_device_events_media_id ON device_events(media_id);
CREATE INDEX IF NOT EXISTS idx_device_events_created_at ON device_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_device_created ON device_events(device_id, created_at DESC);

-- Add index on devices.last_heartbeat for online status queries
CREATE INDEX IF NOT EXISTS idx_devices_last_heartbeat ON devices(last_heartbeat DESC);

-- Add comments for documentation
COMMENT ON TABLE device_events IS 'Tracks all media playback events from Android devices for proof of play';
COMMENT ON COLUMN device_events.event_type IS 'Type of event: media_start, media_end, media_error';
COMMENT ON COLUMN device_events.metadata IS 'Additional event data including duration, position, error details';
