-- Add content_type field to screens table
ALTER TABLE screens 
ADD COLUMN content_type VARCHAR(20) DEFAULT 'none' CHECK (content_type IN ('playlist', 'asset', 'none'));

-- Update existing screens based on their current content assignment
-- Set to 'playlist' if screen has active playlist assignment
UPDATE screens 
SET content_type = 'playlist' 
WHERE id IN (
    SELECT DISTINCT screen_id 
    FROM screen_playlists 
    WHERE is_active = true
);

-- Set to 'asset' if screen has media_id assigned
UPDATE screens 
SET content_type = 'asset' 
WHERE media_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN screens.content_type IS 'Type of content assigned to screen: playlist, asset, or none';
