-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price, billing_interval, max_screens, max_users, max_storage_gb, features) VALUES
('Free', 'Perfect for small businesses starting with digital signage', 0.00, 'monthly', 1, 1, 1, 
 '["Easy screen pairing with a unique code", "Upload and schedule media in real time", "Basic template and branding options", "Manage a single display screen", "Starter plan with platform watermark"]'::jsonb),

('Pro Monthly', 'Designed for growing brands that need more flexibility', 60.00, 'monthly', 10, 5, 10,
 '["Connect and manage up to 10 screens", "Advanced scheduling and playlists", "Custom branding and templates", "Multi-user team access", "Email support with priority response"]'::jsonb),

('Pro Yearly', 'Designed for growing brands that need more flexibility', 46.00, 'yearly', 10, 5, 10,
 '["Connect and manage up to 10 screens", "Advanced scheduling and playlists", "Custom branding and templates", "Multi-user team access", "Email support with priority response"]'::jsonb),

('Ultra Monthly', 'Built for enterprises and franchises at scale', 200.00, 'monthly', -1, -1, 100,
 '["Unlimited screens and locations", "Centralized control panel for networks", "White-label branding and custom domains", "24/7 premium support", "Dedicated account manager and onboarding"]'::jsonb),

('Ultra Yearly', 'Built for enterprises and franchises at scale', 160.00, 'yearly', -1, -1, 100,
 '["Unlimited screens and locations", "Centralized control panel for networks", "White-label branding and custom domains", "24/7 premium support", "Dedicated account manager and onboarding"]'::jsonb);

-- Insert feature permissions for each plan
INSERT INTO public.feature_permissions (plan_id, feature_key, feature_name, is_enabled, limit_value)
SELECT 
    sp.id,
    fp.feature_key,
    fp.feature_name,
    fp.is_enabled,
    fp.limit_value
FROM public.subscription_plans sp
CROSS JOIN (
    VALUES 
    ('max_screens', 'Maximum Screens', true, NULL),
    ('custom_branding', 'Custom Branding', false, NULL),
    ('multi_user', 'Multi-user Access', false, NULL),
    ('advanced_scheduling', 'Advanced Scheduling', false, NULL),
    ('priority_support', 'Priority Support', false, NULL),
    ('white_label', 'White Label Branding', false, NULL),
    ('dedicated_manager', 'Dedicated Account Manager', false, NULL),
    ('api_access', 'API Access', false, NULL)
) AS fp(feature_key, feature_name, is_enabled, limit_value);

-- Update feature permissions based on plan
UPDATE public.feature_permissions 
SET is_enabled = true 
WHERE plan_id IN (
    SELECT id FROM public.subscription_plans WHERE name LIKE 'Pro%'
) AND feature_key IN ('custom_branding', 'multi_user', 'advanced_scheduling', 'priority_support');

UPDATE public.feature_permissions 
SET is_enabled = true 
WHERE plan_id IN (
    SELECT id FROM public.subscription_plans WHERE name LIKE 'Ultra%'
) AND feature_key IN ('custom_branding', 'multi_user', 'advanced_scheduling', 'priority_support', 'white_label', 'dedicated_manager', 'api_access');
