-- Create pending_signups table for paid plan signups
-- User is only created after Stripe payment is confirmed

CREATE TABLE IF NOT EXISTS pending_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  plan_id UUID REFERENCES subscription_plans(id),
  price_id UUID REFERENCES subscription_prices(id),
  stripe_price_id TEXT NOT NULL,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index for quick lookup by stripe session
CREATE INDEX IF NOT EXISTS idx_pending_signups_stripe_session ON pending_signups(stripe_session_id);

-- Index for cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_pending_signups_expires_at ON pending_signups(expires_at);

-- RLS policies
ALTER TABLE pending_signups ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON pending_signups
  FOR ALL
  USING (auth.role() = 'service_role');
