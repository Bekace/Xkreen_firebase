-- Add screen_code column to screens table for pairing functionality
ALTER TABLE screens 
ADD COLUMN screen_code VARCHAR(8) UNIQUE;

-- Add index for faster lookups
CREATE INDEX idx_screens_screen_code ON screens(screen_code);

-- Add comment for documentation
COMMENT ON COLUMN screens.screen_code IS 'Unique pairing code for screen identification';
