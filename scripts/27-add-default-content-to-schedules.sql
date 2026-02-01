-- Add default content columns to schedules table
-- This allows schedules to specify fallback content for time gaps

ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS default_content_type TEXT CHECK (default_content_type IN ('playlist', 'media')),
ADD COLUMN IF NOT EXISTS default_content_id UUID;

-- Add foreign key constraints
ALTER TABLE schedules
ADD CONSTRAINT fk_default_playlist
  FOREIGN KEY (default_content_id)
  REFERENCES playlists(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE schedules
ADD CONSTRAINT fk_default_media
  FOREIGN KEY (default_content_id)
  REFERENCES media(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- Add check constraint to ensure content_id matches content_type
ALTER TABLE schedules
ADD CONSTRAINT check_default_content_consistency
  CHECK (
    (default_content_type IS NULL AND default_content_id IS NULL) OR
    (default_content_type IS NOT NULL AND default_content_id IS NOT NULL)
  );

COMMENT ON COLUMN schedules.default_content_type IS 'Type of default content to play during gaps (playlist or media)';
COMMENT ON COLUMN schedules.default_content_id IS 'ID of the default playlist or media to play during gaps';
