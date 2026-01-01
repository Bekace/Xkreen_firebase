-- Fix RLS policy to allow users to see their own deleted_at status
-- This is necessary so the middleware can check if a user is soft-deleted

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create a new policy that allows users to see their profile even if deleted
-- This is needed so we can check deleted_at in middleware and show proper error
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Note: The deleted_at check is now handled in application code (middleware/callback)
-- rather than at the RLS level, which allows us to show proper error messages
