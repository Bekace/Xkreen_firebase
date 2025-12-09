-- Assign Free plan to all existing users who don't have a subscription
-- Run this after the migration to restore access for existing users

-- First, get the Free plan ID and its monthly price ID
DO $$
DECLARE
  free_plan_id UUID;
  free_price_id UUID;
BEGIN
  -- Get Free plan ID
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free' AND is_active = true LIMIT 1;
  
  -- Get Free plan monthly price ID
  SELECT id INTO free_price_id FROM subscription_prices WHERE plan_id = free_plan_id AND billing_cycle = 'monthly' LIMIT 1;
  
  -- Log what we found
  RAISE NOTICE 'Free plan ID: %', free_plan_id;
  RAISE NOTICE 'Free price ID: %', free_price_id;
  
  -- Insert subscriptions for all users in profiles who don't have one
  INSERT INTO user_subscriptions (user_id, plan_id, price_id, status, current_period_start, current_period_end)
  SELECT 
    p.id,
    free_plan_id,
    free_price_id,
    'active',
    NOW(),
    NOW() + INTERVAL '100 years'  -- Free plan doesn't expire
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id
  )
  AND free_plan_id IS NOT NULL;
  
  RAISE NOTICE 'Assigned Free plan to all existing users without subscriptions';
END $$;

-- Show results
SELECT 
  p.email,
  sp.name as plan_name,
  us.status,
  us.created_at
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
ORDER BY us.created_at DESC;
