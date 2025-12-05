-- Fix missing screen codes and content types
UPDATE screens 
SET screen_code = 'SCR-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8))
WHERE screen_code IS NULL OR screen_code = '';

-- Set content_type based on existing assignments
UPDATE screens 
SET content_type = CASE 
    WHEN media_id IS NOT NULL THEN 'asset'
    WHEN EXISTS (SELECT 1 FROM screen_playlists sp WHERE sp.screen_id = screens.id AND sp.is_active = true) THEN 'playlist'
    ELSE 'none'
END
WHERE content_type IS NULL OR content_type = '';

-- Fix device-screen relationships
UPDATE devices 
SET screen_id = (
    SELECT s.id 
    FROM screens s 
    WHERE s.user_id = devices.user_id 
    AND devices.screen_id IS NULL
    LIMIT 1
)
WHERE screen_id IS NULL AND user_id IS NOT NULL;

-- Ensure devices have proper pairing status
UPDATE devices 
SET is_paired = true 
WHERE screen_id IS NOT NULL AND is_paired = false;
