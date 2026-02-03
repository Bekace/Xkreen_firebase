-- Add display and scaling settings to screens table

ALTER TABLE screens
ADD COLUMN IF NOT EXISTS shuffle BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scale_image TEXT DEFAULT 'fit',
ADD COLUMN IF NOT EXISTS scale_video TEXT DEFAULT 'fit',
ADD COLUMN IF NOT EXISTS scale_document TEXT DEFAULT 'fit',
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS default_transition TEXT DEFAULT 'fade';

-- Add comments for documentation
COMMENT ON COLUMN screens.shuffle IS 'Whether to shuffle content playback order';
COMMENT ON COLUMN screens.is_active IS 'Whether the screen is active and should receive content';
COMMENT ON COLUMN screens.scale_image IS 'Image scaling mode: fill, fit, or stretch';
COMMENT ON COLUMN screens.scale_video IS 'Video scaling mode: fill, fit, or stretch';
COMMENT ON COLUMN screens.scale_document IS 'Document scaling mode: fill, fit, or stretch';
COMMENT ON COLUMN screens.background_color IS 'Background color in hex format (e.g., #000000)';
COMMENT ON COLUMN screens.default_transition IS 'Default transition effect: fade, slide, or none';
