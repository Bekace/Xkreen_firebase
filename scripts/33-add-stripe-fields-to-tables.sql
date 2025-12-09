-- Add Stripe-related fields to user_subscriptions table
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Add Stripe-related fields to subscription_plans table
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT,
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer 
ON public.user_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription 
ON public.user_subscriptions(stripe_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN public.user_subscriptions.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN public.user_subscriptions.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN public.user_subscriptions.stripe_price_id IS 'Stripe price ID for the subscription';
COMMENT ON COLUMN public.user_subscriptions.payment_method IS 'Payment method details (e.g., card type and last 4 digits)';
COMMENT ON COLUMN public.user_subscriptions.trial_ends_at IS 'Trial period end date';
