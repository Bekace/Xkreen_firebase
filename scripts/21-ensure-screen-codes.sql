-- Ensure all screens have screen codes
UPDATE screens 
SET screen_code = 'SCR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE screen_code IS NULL OR screen_code = '';

-- Verify screen codes are unique
WITH duplicates AS (
  SELECT screen_code, COUNT(*) as count
  FROM screens 
  WHERE screen_code IS NOT NULL
  GROUP BY screen_code
  HAVING COUNT(*) > 1
)
UPDATE screens 
SET screen_code = 'SCR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT || NOW()::TEXT) FROM 1 FOR 8))
WHERE screen_code IN (SELECT screen_code FROM duplicates);

-- Show all screens with their codes
SELECT id, name, screen_code, content_type, media_id 
FROM screens 
ORDER BY created_at DESC;
