-- Add is_muted column to media table
-- This allows videos to be marked as muted in the dashboard and play without audio on Android

ALTER TABLE public.media
ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.media.is_muted IS 'Whether the video should play muted on Android devices';
