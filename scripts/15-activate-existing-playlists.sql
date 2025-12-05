-- Activate all existing playlists that are currently inactive
UPDATE playlists 
SET is_active = true 
WHERE is_active = false;
