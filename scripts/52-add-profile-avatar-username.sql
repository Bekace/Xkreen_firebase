-- Add avatar_url and username columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Add constraint for username format (alphanumeric, dashes, underscores only)
ALTER TABLE profiles
ADD CONSTRAINT username_format CHECK (username ~* '^[a-z0-9_-]+$');
