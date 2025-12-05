-- Update the content_type check constraint to allow 'mixed' value
-- This allows screens to have both playlists and media assets assigned

-- Drop the old constraint
ALTER TABLE screens DROP CONSTRAINT IF EXISTS screens_content_type_check;

-- Add the new constraint with 'mixed' option
ALTER TABLE screens ADD CONSTRAINT screens_content_type_check 
  CHECK (content_type IN ('playlist', 'asset', 'mixed', 'none'));

-- Update existing screens with both playlists and media to 'mixed'
UPDATE screens 
SET content_type = 'mixed'
WHERE id IN (
  SELECT DISTINCT s.id 
  FROM screens s
  INNER JOIN screen_playlists sp ON s.id = sp.screen_id
  WHERE s.media_id IS NOT NULL
);
