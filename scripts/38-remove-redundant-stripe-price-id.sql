-- Remove redundant stripe_price_id column from user_subscriptions
-- This column is now redundant because price_id references subscription_prices
-- which already contains the stripe_price_id

-- Drop the redundant column
ALTER TABLE user_subscriptions DROP COLUMN IF EXISTS stripe_price_id;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;
