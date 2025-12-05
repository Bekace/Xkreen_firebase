-- Update media files that don't have file_size set
-- This script will help fix existing files that might be missing file size data

-- First, let's see how many files are missing file_size
SELECT 
  COUNT(*) as total_files,
  COUNT(file_size) as files_with_size,
  COUNT(*) - COUNT(file_size) as files_missing_size
FROM media;

-- For files missing file_size, we can't retroactively get the exact size
-- but we can set a reasonable estimate or mark them for re-upload
-- This is mainly for debugging - in production you'd want to handle this differently

-- Update any NULL file_size values to 0 to prevent calculation issues
UPDATE media 
SET file_size = 0 
WHERE file_size IS NULL;

-- Show current storage usage by user
SELECT 
  user_id,
  COUNT(*) as file_count,
  SUM(COALESCE(file_size, 0)) as total_bytes,
  ROUND(SUM(COALESCE(file_size, 0)) / 1024.0 / 1024.0, 2) as total_mb
FROM media 
GROUP BY user_id
ORDER BY total_bytes DESC;
