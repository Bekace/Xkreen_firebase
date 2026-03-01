-- Migration: New per-screen billing model
-- 1. Add free_screens to subscription_plans (admin-configurable per plan)
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS free_screens integer NOT NULL DEFAULT 0;

-- 2. Add cancel_at_period_end and cancellation_reason to user_subscriptions
--    (referenced in code but missing from DB)
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- 3. Set max_screens = -1 (unlimited) for all non-Free paid plans
--    since billing is now controlled per-screen via Stripe quantity.
UPDATE subscription_plans
  SET max_screens = -1
  WHERE LOWER(name) != 'free';

-- Verify
SELECT id, name, max_screens, free_screens FROM subscription_plans ORDER BY name;
