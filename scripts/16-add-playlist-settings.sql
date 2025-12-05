-- Add new playlist settings columns
ALTER TABLE playlists 
ADD COLUMN IF NOT EXISTS scale_image text DEFAULT 'fit',
ADD COLUMN IF NOT EXISTS scale_video text DEFAULT 'fit', 
ADD COLUMN IF NOT EXISTS scale_document text DEFAULT 'fit',
ADD COLUMN IF NOT EXISTS shuffle boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS default_transition text DEFAULT 'fade';

-- Add check constraints for valid values
ALTER TABLE playlists 
ADD CONSTRAINT check_scale_image CHECK (scale_image IN ('fit', 'fill', 'stretch', 'center')),
ADD CONSTRAINT check_scale_video CHECK (scale_video IN ('fit', 'fill', 'stretch', 'center')),
ADD CONSTRAINT check_scale_document CHECK (scale_document IN ('fit', 'fill', 'stretch', 'center')),
ADD CONSTRAINT check_default_transition CHECK (default_transition IN ('fade', 'slide', 'zoom', 'none'));
