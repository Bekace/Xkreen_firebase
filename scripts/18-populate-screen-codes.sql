-- Generate screen codes for screens that don't have them
UPDATE screens 
SET screen_code = 'SCR-' || UPPER(SUBSTRING(REPLACE(CAST(gen_random_uuid() AS TEXT), '-', ''), 1, 8))
WHERE screen_code IS NULL OR screen_code = '';

-- Ensure all screen codes are unique by adding a suffix if duplicates exist
WITH duplicates AS (
  SELECT screen_code, COUNT(*) as count
  FROM screens 
  WHERE screen_code IS NOT NULL
  GROUP BY screen_code 
  HAVING COUNT(*) > 1
)
UPDATE screens 
SET screen_code = screen_code || '-' || ROW_NUMBER() OVER (PARTITION BY screen_code ORDER BY created_at)
WHERE screen_code IN (SELECT screen_code FROM duplicates);
