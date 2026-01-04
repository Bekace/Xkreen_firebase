-- Add enable_audio_management column to screens table
-- When true, audio playback is muted/disabled
-- When false (default), audio plays normally

ALTER TABLE screens 
ADD COLUMN enable_audio_management BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN screens.enable_audio_management IS 'When true, audio playback is muted/disabled. When false (default), audio plays normally.';
