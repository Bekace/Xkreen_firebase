-- =====================================================
-- MIGRATION: Normalize subscription_plans into two tables
-- =====================================================
-- This script creates a normalized structure:
-- 1. subscription_plans - Plan definitions (no duplication)
-- 2. subscription_prices - Pricing variants per plan
-- =====================================================

-- Step 1: Create the new subscription_prices table
CREATE TABLE IF NOT EXISTS public.subscription_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id uuid NOT NULL,
    billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly', 'lifetime')),
    price numeric(10,2) NOT NULL DEFAULT 0,
    stripe_price_id text,
    trial_days integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(plan_id, billing_cycle)
);

-- Step 2: Enable RLS on the new table
ALTER TABLE public.subscription_prices ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for subscription_prices
CREATE POLICY "Allow authenticated users to read subscription prices"
    ON public.subscription_prices
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Superadmins can manage subscription prices"
    ON public.subscription_prices
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );

-- Step 4: Clear existing data and insert normalized plans
-- First, delete existing plans to start fresh
DELETE FROM public.feature_permissions;
DELETE FROM public.user_subscriptions;
DELETE FROM public.subscription_plans;

-- Step 5: Insert normalized subscription plans (one row per plan, no billing cycle duplication)
INSERT INTO public.subscription_plans (
    id,
    name, 
    description, 
    features,
    max_screens,
    max_playlists,
    max_media_storage,
    max_file_size,
    storage_unit,
    stripe_product_id,
    is_active,
    created_at,
    updated_at
) VALUES 
(
    gen_random_uuid(),
    'Free',
    'Perfect for small businesses starting with digital signage',
    '{
        "max_screens": 2,
        "max_playlists": 5,
        "max_media_storage_mb": 1024,
        "display_features": [
            "Up to 2 screens",
            "5 playlists",
            "1GB storage",
            "Basic templates",
            "Community support"
        ]
    }'::jsonb,
    2,
    5,
    1024,
    52428800,
    'MB',
    'prod_TZQHLMBz7jCj8Q',
    true,
    now(),
    now()
),
(
    gen_random_uuid(),
    'Pro',
    'Designed for growing brands that need more flexibility',
    '{
        "max_screens": 10,
        "max_playlists": 50,
        "max_media_storage_mb": 51200,
        "display_features": [
            "Up to 10 screens",
            "50 playlists",
            "50GB storage",
            "Advanced scheduling",
            "Custom branding",
            "Multi-user access",
            "Priority email support",
            "Analytics dashboard"
        ]
    }'::jsonb,
    10,
    50,
    51200,
    524288000,
    'MB',
    'prod_TZQHh8yik1k64X',
    true,
    now(),
    now()
),
(
    gen_random_uuid(),
    'Enterprise',
    'Built for enterprises and franchises at scale',
    '{
        "max_screens": -1,
        "max_playlists": -1,
        "max_media_storage_mb": 512000,
        "display_features": [
            "Unlimited screens",
            "Unlimited playlists",
            "500GB storage",
            "White-label branding",
            "Custom domains",
            "API access",
            "24/7 premium support",
            "Dedicated account manager",
            "Custom integrations"
        ]
    }'::jsonb,
    -1,
    -1,
    512000,
    1073741824,
    'MB',
    'prod_TZQIVfnNl7r4GR',
    true,
    now(),
    now()
);

-- Step 6: Insert subscription prices (separate rows for each billing cycle)
-- Free plan prices
INSERT INTO public.subscription_prices (plan_id, billing_cycle, price, stripe_price_id, trial_days, is_active)
SELECT id, 'monthly', 0, NULL, 0, true
FROM public.subscription_plans WHERE name = 'Free';

INSERT INTO public.subscription_prices (plan_id, billing_cycle, price, stripe_price_id, trial_days, is_active)
SELECT id, 'yearly', 0, NULL, 0, true
FROM public.subscription_plans WHERE name = 'Free';

-- Pro plan prices
INSERT INTO public.subscription_prices (plan_id, billing_cycle, price, stripe_price_id, trial_days, is_active)
SELECT id, 'monthly', 29.00, 'price_1RVJcbCCPPpfVdcjHNT4aXk1', 14, true
FROM public.subscription_plans WHERE name = 'Pro';

INSERT INTO public.subscription_prices (plan_id, billing_cycle, price, stripe_price_id, trial_days, is_active)
SELECT id, 'yearly', 290.00, 'price_1RVJd6CCPPpfVdcj90FBkJE7', 14, true
FROM public.subscription_plans WHERE name = 'Pro';

-- Enterprise plan prices
INSERT INTO public.subscription_prices (plan_id, billing_cycle, price, stripe_price_id, trial_days, is_active)
SELECT id, 'monthly', 99.00, 'price_1RVJdZCCPPpfVdcjAP1DV7Mw', 14, true
FROM public.subscription_plans WHERE name = 'Enterprise';

INSERT INTO public.subscription_prices (plan_id, billing_cycle, price, stripe_price_id, trial_days, is_active)
SELECT id, 'yearly', 990.00, 'price_1RVJdzCCPPpfVdcjBW6LH5MN', 14, true
FROM public.subscription_plans WHERE name = 'Enterprise';

-- Step 7: Add foreign key constraint
ALTER TABLE public.subscription_prices
ADD CONSTRAINT fk_subscription_prices_plan
FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;

-- Step 8: Add price_id column to user_subscriptions if not exists
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS price_id uuid REFERENCES public.subscription_prices(id);

-- Step 9: Remove redundant columns from subscription_plans (optional - can keep for backward compatibility)
-- Commenting out for now to avoid breaking existing code
-- ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS billing_cycle;
-- ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS price;
-- ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS stripe_price_id_monthly;
-- ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS stripe_price_id_yearly;
-- ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS trial_days;

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_prices_plan_id ON public.subscription_prices(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_prices_billing_cycle ON public.subscription_prices(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_subscription_prices_active ON public.subscription_prices(is_active);

-- Step 11: Insert feature permissions for each plan
INSERT INTO public.feature_permissions (plan_id, feature_key, is_enabled, limit_value)
SELECT 
    sp.id,
    fp.feature_key,
    fp.is_enabled,
    fp.limit_value::integer
FROM public.subscription_plans sp
CROSS JOIN (
    VALUES 
    ('max_screens', true, NULL::integer),
    ('custom_branding', false, NULL::integer),
    ('multi_user', false, NULL::integer),
    ('advanced_scheduling', false, NULL::integer),
    ('priority_support', false, NULL::integer),
    ('white_label', false, NULL::integer),
    ('dedicated_manager', false, NULL::integer),
    ('api_access', false, NULL::integer),
    ('analytics', false, NULL::integer)
) AS fp(feature_key, is_enabled, limit_value);

-- Update feature permissions for Pro plan
UPDATE public.feature_permissions 
SET is_enabled = true 
WHERE plan_id IN (
    SELECT id FROM public.subscription_plans WHERE name = 'Pro'
) AND feature_key IN ('custom_branding', 'multi_user', 'advanced_scheduling', 'priority_support', 'analytics');

-- Update feature permissions for Enterprise plan
UPDATE public.feature_permissions 
SET is_enabled = true 
WHERE plan_id IN (
    SELECT id FROM public.subscription_plans WHERE name = 'Enterprise'
) AND feature_key IN ('custom_branding', 'multi_user', 'advanced_scheduling', 'priority_support', 'white_label', 'dedicated_manager', 'api_access', 'analytics');

-- Step 12: Grant necessary permissions
GRANT SELECT ON public.subscription_prices TO authenticated;
GRANT SELECT ON public.subscription_prices TO anon;
