-- Add idempotency column to prevent double-crediting a Stripe Checkout Session
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS last_credited_session_id TEXT;
