-- Enable RLS on devices table
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous device registration" ON devices;
DROP POLICY IF EXISTS "Allow anonymous device status lookup" ON devices;
DROP POLICY IF EXISTS "Allow users to claim devices" ON devices;
DROP POLICY IF EXISTS "Allow users to view their devices" ON devices;

-- Allow anonymous users to register devices (insert only)
CREATE POLICY "Allow anonymous device registration" 
ON devices FOR INSERT 
TO anon 
WITH CHECK (
  device_code IS NOT NULL AND 
  is_paired = false AND
  user_id IS NULL
);

-- Allow anonymous users to lookup device status by device_code
CREATE POLICY "Allow anonymous device status lookup" 
ON devices FOR SELECT 
TO anon 
USING (device_code IS NOT NULL);

-- Allow anonymous users to update device heartbeat
CREATE POLICY "Allow anonymous device heartbeat update" 
ON devices FOR UPDATE 
TO anon 
USING (device_code IS NOT NULL AND user_id IS NULL)
WITH CHECK (device_code IS NOT NULL);

-- Allow authenticated users to claim/pair devices
CREATE POLICY "Allow users to claim devices" 
ON devices FOR UPDATE 
TO authenticated 
USING (user_id IS NULL OR user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to view their claimed devices
CREATE POLICY "Allow users to view their devices" 
ON devices FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Allow authenticated users to delete their devices
CREATE POLICY "Allow users to delete their devices" 
ON devices FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());
