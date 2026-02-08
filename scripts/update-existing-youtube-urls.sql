-- Update existing YouTube embed URLs with optimized parameters
-- This updates videos that were added before the new parameter configuration

UPDATE media
SET 
  file_path = REGEXP_REPLACE(
    file_path,
    '^https://www\.youtube-nocookie\.com/embed/([^?]+)(\?.*)?$',
    'https://www.youtube-nocookie.com/embed/\1?autoplay=1&mute=1&loop=1&playlist=\1&controls=0&rel=0&modestbranding=1&fs=0&disablekb=1&playsinline=1'
  ),
  embed_status = 'pending',
  updated_at = NOW()
WHERE 
  file_path LIKE '%youtube-nocookie.com/embed/%'
  AND file_path NOT LIKE '%playlist=%';

-- Display updated records
SELECT id, name, file_path, embed_status
FROM media
WHERE file_path LIKE '%youtube-nocookie.com/embed/%'
ORDER BY updated_at DESC;
