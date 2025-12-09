-- Create upload_settings table for global file upload configuration
CREATE TABLE IF NOT EXISTS public.upload_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_file_size BIGINT NOT NULL DEFAULT 10485760, -- 10 MB in bytes
  allowed_file_types JSONB NOT NULL DEFAULT '["image/jpeg","image/jpg","image/png","image/gif","image/webp","image/svg+xml","video/mp4","video/mpeg","video/quicktime","video/webm","video/x-msvideo","application/pdf"]'::jsonb,
  enforce_globally BOOLEAN NOT NULL DEFAULT false, -- If true, override plan limits
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default settings
INSERT INTO public.upload_settings (id, max_file_size, allowed_file_types, enforce_globally)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  10485760, -- 10 MB default
  '["image/jpeg","image/jpg","image/png","image/gif","image/webp","image/svg+xml","video/mp4","video/mpeg","video/quicktime","video/webm","video/x-msvideo","application/pdf"]'::jsonb,
  false
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.upload_settings ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage upload settings
CREATE POLICY "Superadmins can manage upload settings"
  ON public.upload_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- All authenticated users can view upload settings
CREATE POLICY "Users can view upload settings"
  ON public.upload_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE public.upload_settings IS 'Global file upload configuration managed by super admins';
