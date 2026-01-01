-- Add deleted_at column for soft delete
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add deleted_by column to track who deleted the user
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) DEFAULT NULL;

-- Create index for faster queries on non-deleted users
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

-- Update RLS policy to filter out deleted users for regular queries
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Recreate policy to exclude soft-deleted users
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (
  auth.uid() = id 
  AND deleted_at IS NULL
);

-- Add comment for documentation
COMMENT ON COLUMN profiles.deleted_at IS 'Soft delete timestamp - when set, user is considered deleted';
COMMENT ON COLUMN profiles.deleted_by IS 'ID of the admin who deleted this user';
