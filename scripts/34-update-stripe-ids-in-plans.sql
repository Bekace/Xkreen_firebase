-- Update subscription plans with Stripe product and price IDs
-- Run this after creating Stripe products and prices

-- Update Free plan with Stripe product ID
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_TZQHhY955mjPPZ',
  updated_at = NOW()
WHERE name = 'Free';

-- Update Pro Monthly plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_TZQHh8yik1k64X',
  stripe_price_id_monthly = 'price_1ScHSKPCOYuBZG3wkwqMxKDP',
  updated_at = NOW()
WHERE name = 'Pro' AND billing_cycle = 'monthly';

-- Update Pro Yearly plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_TZQHh8yik1k64X',
  stripe_price_id_yearly = 'price_1ScHSkPCOYuBZG3wvBS8yuFU',
  updated_at = NOW()
WHERE name = 'Pro' AND billing_cycle = 'yearly';

-- Update Ultra Monthly plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_TZQIVfnNl7r4GR',
  stripe_price_id_monthly = 'price_1ScHTEPCOYuBZG3wrhVguWVM',
  updated_at = NOW()
WHERE name = 'Ultra' AND billing_cycle = 'monthly';

-- Update Ultra Yearly plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_TZQIVfnNl7r4GR',
  stripe_price_id_yearly = 'price_1ScHTSPCOYuBZG3wYxTUYN9m',
  updated_at = NOW()
WHERE name = 'Ultra' AND billing_cycle = 'yearly';
