-- Fix device RLS policies to support device-initiated pairing flow
-- Drop existing policies first
DROP POLICY IF EXISTS "devices_select_own" ON devices;
DROP POLICY IF EXISTS "devices_insert_own" ON devices;
DROP POLICY IF EXISTS "devices_update_own" ON devices;
DROP POLICY IF EXISTS "devices_delete_own" ON devices;

-- Allow anonymous device registration (for player page)
CREATE POLICY "devices_insert_anonymous"
  ON devices FOR INSERT
  WITH CHECK (user_id IS NULL);

-- Allow reading devices by device_code (for status polling)
CREATE POLICY "devices_select_by_code"
  ON devices FOR SELECT
  USING (true);

-- Allow users to update their own devices OR claim unassigned devices
CREATE POLICY "devices_update_own_or_claim"
  ON devices FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND auth.uid() IS NOT NULL)
  );

-- Allow users to delete their own devices
CREATE POLICY "devices_delete_own"
  ON devices FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
