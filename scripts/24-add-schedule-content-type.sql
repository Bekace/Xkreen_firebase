-- Update content_type constraint to include 'schedule'
ALTER TABLE screens DROP CONSTRAINT IF EXISTS screens_content_type_check;

ALTER TABLE screens 
ADD CONSTRAINT screens_content_type_check 
CHECK (content_type IN ('playlist', 'asset', 'schedule', 'none'));

-- Add comment
COMMENT ON COLUMN screens.content_type IS 'Type of content assigned to screen: playlist, asset, schedule, or none';
