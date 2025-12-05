-- Add background_color column to playlists table
ALTER TABLE playlists 
ADD COLUMN background_color VARCHAR(7) DEFAULT '#000000';

-- Add comment to describe the column
COMMENT ON COLUMN playlists.background_color IS 'Hex color code for playlist background during preview';
