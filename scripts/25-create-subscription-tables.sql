-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
    features JSONB DEFAULT '[]'::jsonb,
    max_screens INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 1,
    max_storage_gb INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    stripe_price_id TEXT, -- For Stripe integration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE RESTRICT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'cancelled', 'past_due')),
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id TEXT, -- For Stripe integration
    stripe_customer_id TEXT, -- For Stripe integration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feature permissions table
CREATE TABLE IF NOT EXISTS public.feature_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
    feature_key TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    limit_value INTEGER, -- For features with limits (e.g., max screens)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plan_id, feature_key)
);

-- Enable RLS on subscription tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_plans (readable by all authenticated users)
CREATE POLICY "Authenticated users can view subscription plans" ON public.subscription_plans
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS policies for user_subscriptions (users can only see their own)
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for feature_permissions (readable by all authenticated users)
CREATE POLICY "Authenticated users can view feature permissions" ON public.feature_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_feature_permissions_plan_id ON public.feature_permissions(plan_id);
CREATE INDEX IF NOT EXISTS idx_feature_permissions_feature_key ON public.feature_permissions(feature_key);

-- Add updated_at triggers
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
