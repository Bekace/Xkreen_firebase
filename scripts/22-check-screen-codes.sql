-- Check if screen codes exist and list them
SELECT screen_code, name, content_type, media_id, created_at 
FROM screens 
WHERE screen_code IS NOT NULL 
ORDER BY created_at DESC;

-- Check for the specific screen code
SELECT * FROM screens WHERE screen_code = 'SCR-MF7CVINA';

-- Count total screens vs screens with codes
SELECT 
  COUNT(*) as total_screens,
  COUNT(screen_code) as screens_with_codes
FROM screens;
