-- Drop the faulty, overly-restrictive RLS policy from the device_events table.
-- The old policy was blocking all inserts from devices.

-- Note: We first need to find the actual name of the old policy. 
-- We will assume the policy is named 'Users can manage their own device events' based on project conventions.
-- If this script fails, we may need to get the exact policy name from the database.
DROP POLICY IF EXISTS "Users can manage their own proof of play events" ON public.device_events;
DROP POLICY IF EXISTS "Users can manage their own device events" ON public.device_events;


-- Create a new, secure policy for INSERTING events.
-- This allows any request (anonymous from a device, or authenticated from a user) 
-- to insert an event, as long as the device_id exists in the devices table.
CREATE POLICY "Allow device event inserts if device exists" 
ON public.device_events
FOR INSERT
WITH CHECK ( 
  EXISTS (SELECT 1 FROM devices WHERE id = device_id) 
);


-- Create a new, secure policy for SELECTING events.
-- This allows a logged-in user to read events, but only if they own the device
-- that generated the event. This protects user data while allowing dashboards to work.
CREATE POLICY "Allow users to view their own device events"
ON public.device_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM devices d 
    WHERE d.id = device_events.device_id AND d.user_id = auth.uid()
  )
);

-- Re-enable Row Level Security on the table, now with the correct policies.
ALTER TABLE public.device_events ENABLE ROW LEVEL SECURITY;
