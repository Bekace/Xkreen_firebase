-- Add transition columns to playlist_items table
ALTER TABLE playlist_items 
ADD COLUMN transition_type text DEFAULT 'fade',
ADD COLUMN transition_duration numeric DEFAULT 0.8;

-- Add comment for documentation
COMMENT ON COLUMN playlist_items.transition_type IS 'Type of transition effect: fade, slide-left, slide-right, zoom, cross-fade';
COMMENT ON COLUMN playlist_items.transition_duration IS 'Duration of transition effect in seconds';
