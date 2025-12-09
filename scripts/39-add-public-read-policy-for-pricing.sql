-- Add public read access to subscription_plans and subscription_prices
-- This allows unauthenticated users to view pricing during sign-up

-- Allow anyone to read active subscription plans
CREATE POLICY "Allow public to read active subscription plans"
ON subscription_plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Allow anyone to read active subscription prices
CREATE POLICY "Allow public to read active subscription prices"
ON subscription_prices
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Verify policies were created
SELECT tablename, policyname, roles, cmd
FROM pg_policies 
WHERE tablename IN ('subscription_plans', 'subscription_prices')
ORDER BY tablename, policyname;
