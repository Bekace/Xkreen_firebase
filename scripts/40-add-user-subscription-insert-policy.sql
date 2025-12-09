-- Add policy to allow users to insert their own subscription
-- This is needed during sign-up when a user creates their initial subscription

-- Policy: Users can create their own subscription
CREATE POLICY "Users can create own subscription"
ON user_subscriptions
FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());

-- Also add UPDATE policy so users can update their own subscription (e.g., cancel)
CREATE POLICY "Users can update own subscription"
ON user_subscriptions
FOR UPDATE
TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verify policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
ORDER BY cmd;
