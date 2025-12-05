-- Create screen_media junction table to support multiple media assets per screen
-- This mirrors the screen_playlists structure

CREATE TABLE IF NOT EXISTS screen_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(screen_id, media_id)
);

-- Add RLS policies
ALTER TABLE screen_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage screen media"
  ON screen_media
  FOR ALL
  USING (
    screen_id IN (
      SELECT id FROM screens WHERE user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX idx_screen_media_screen_id ON screen_media(screen_id);
CREATE INDEX idx_screen_media_media_id ON screen_media(media_id);

COMMENT ON TABLE screen_media IS 'Junction table linking screens to multiple media assets';
