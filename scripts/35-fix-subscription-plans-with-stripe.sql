-- First, add missing columns if they don't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text,
ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 14;

-- Update existing Free plan with Stripe product ID and feature display list
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_TZQGlwVOa7g3Ew',
  features = jsonb_build_object(
    'max_playlists', 25,
    'max_media_assets', 100,
    'display_features', jsonb_build_array(
      '2 screens',
      '1GB storage',
      '25 playlists',
      '100 media assets',
      'Basic analytics'
    )
  )
WHERE name = 'Free' AND billing_cycle = 'monthly';

-- Update existing Pro plan with Stripe IDs and feature display list
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_TZQHh8yik1k64X',
  stripe_price_id_monthly = 'price_1QfTJEEbQfDGdRMOLRiJcdZy',
  features = jsonb_build_object(
    'max_playlists', 100,
    'max_media_assets', 500,
    'display_features', jsonb_build_array(
      '10 screens',
      '50GB storage',
      '100 playlists',
      '500 media assets',
      'Advanced analytics',
      'Priority support',
      '14-day free trial'
    )
  ),
  trial_days = 14
WHERE name = 'Pro' AND billing_cycle = 'monthly';

-- Rename Enterprises to Ultra and update with Stripe IDs
UPDATE subscription_plans 
SET 
  name = 'Ultra',
  stripe_product_id = 'prod_TZQIVfnNl7r4GR',
  stripe_price_id_monthly = 'price_1QfTJlEbQfDGdRMOdVNlXgVX',
  features = jsonb_build_object(
    'max_playlists', -1,
    'max_media_assets', -1,
    'display_features', jsonb_build_array(
      'Unlimited screens',
      '500GB storage',
      'Unlimited playlists',
      'Unlimited media assets',
      'Advanced analytics',
      'White-label options',
      'Dedicated support',
      '14-day free trial'
    )
  ),
  description = 'Enterprise plan for large organizations',
  trial_days = 14
WHERE name = 'Enterprises' AND billing_cycle = 'monthly';

-- Add yearly Pro plan
INSERT INTO subscription_plans (name, description, price, billing_cycle, is_active, stripe_product_id, stripe_price_id_yearly, trial_days, features)
VALUES (
  'Pro',
  'Professional plan for growing businesses',
  290.00,
  'yearly',
  true,
  'prod_TZQHh8yik1k64X',
  'price_1QfTJWEbQfDGdRMOt17IvOvS',
  14,
  jsonb_build_object(
    'max_playlists', 100,
    'max_media_assets', 500,
    'display_features', jsonb_build_array(
      '10 screens',
      '50GB storage',
      '100 playlists',
      '500 media assets',
      'Advanced analytics',
      'Priority support',
      '14-day free trial',
      'Save 2 months'
    )
  )
)
ON CONFLICT DO NOTHING;

-- Add yearly Ultra plan
INSERT INTO subscription_plans (name, description, price, billing_cycle, is_active, stripe_product_id, stripe_price_id_yearly, trial_days, features)
VALUES (
  'Ultra',
  'Enterprise plan for large organizations',
  990.00,
  'yearly',
  true,
  'prod_TZQIVfnNl7r4GR',
  'price_1QfTKKEbQfDGdRMOPEvr0vSk',
  14,
  jsonb_build_object(
    'max_playlists', -1,
    'max_media_assets', -1,
    'display_features', jsonb_build_array(
      'Unlimited screens',
      '500GB storage',
      'Unlimited playlists',
      'Unlimited media assets',
      'Advanced analytics',
      'White-label options',
      'Dedicated support',
      '14-day free trial',
      'Save 2 months'
    )
  )
)
ON CONFLICT DO NOTHING;
