-- Add purchased_screen_slots to user_subscriptions
-- This tracks screen slots explicitly purchased via Stripe Checkout,
-- separate from the current screen count, so available slots can be shown.
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS purchased_screen_slots integer NOT NULL DEFAULT 0;
