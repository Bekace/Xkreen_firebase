-- Add media_id field to screens table for single asset assignment
ALTER TABLE screens ADD COLUMN media_id uuid REFERENCES media(id);

-- Add index for better performance
CREATE INDEX idx_screens_media_id ON screens(media_id);
