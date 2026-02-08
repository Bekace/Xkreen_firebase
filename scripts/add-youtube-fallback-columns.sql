-- Add columns to support YouTube URL fallback system
-- This allows the system to store original URLs and track embed status

-- Add original_url column to store the user-provided URL
ALTER TABLE media 
ADD COLUMN IF NOT EXISTS original_url TEXT;

-- Add embed_status column to track YouTube embed configuration status
-- Possible values: 'pending', 'restrictive', 'moderate', 'permissive', 'failed'
ALTER TABLE media 
ADD COLUMN IF NOT EXISTS embed_status TEXT DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN media.original_url IS 'Original URL provided by user (e.g., https://youtu.be/VIDEO_ID)';
COMMENT ON COLUMN media.embed_status IS 'YouTube embed configuration status: pending, restrictive, moderate, permissive, or failed';
