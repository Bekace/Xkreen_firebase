-- Add missing columns to media table to match the upload API expectations
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS blob_url TEXT,
ADD COLUMN IF NOT EXISTS filename TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Update existing records to populate new columns from existing data
UPDATE public.media 
SET 
    filename = name,
    file_type = mime_type
WHERE filename IS NULL OR file_type IS NULL;

-- Create index on blob_url for better performance
CREATE INDEX IF NOT EXISTS idx_media_blob_url ON public.media(blob_url);
