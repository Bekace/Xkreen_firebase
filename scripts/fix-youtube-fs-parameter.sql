-- Remove fs=0 parameter from existing YouTube videos
-- This parameter combined with controls=0 causes Error 153

UPDATE media
SET file_path = REGEXP_REPLACE(
  file_path,
  '&fs=0',
  '',
  'g'
)
WHERE mime_type = 'video/youtube'
  AND file_path LIKE '%&fs=0%';

-- Also remove if it's the first parameter (unlikely but possible)
UPDATE media
SET file_path = REGEXP_REPLACE(
  file_path,
  '\?fs=0&',
  '?',
  'g'
)
WHERE mime_type = 'video/youtube'
  AND file_path LIKE '%?fs=0&%';
