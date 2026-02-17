-- Clean up feature permissions to only include features that actually exist
-- Remove: sessions, statistics, schedules (non-existent features)
-- Remove: max_screens (it's a numeric limit in subscription_plans, not a feature toggle)
-- Keep: scheduling, analytics, locations, media_youtube, media_google_slides, ai_analytics

-- Delete non-existent features
DELETE FROM feature_permissions 
WHERE feature_key IN ('sessions', 'statistics', 'schedules', 'max_screens', 'advanced_scheduling', 'location_management', 'multi_user', 'api_access', 'custom_branding', 'dedicated_manager', 'priority_support', 'white_label');

-- Ensure all plans have the correct feature permissions
DO $$
DECLARE
  free_plan_id uuid;
  pro_plan_id uuid;
  enterprise_plan_id uuid;
BEGIN
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free';
  SELECT id INTO pro_plan_id FROM subscription_plans WHERE name = 'Pro';
  SELECT id INTO enterprise_plan_id FROM subscription_plans WHERE name = 'Enterprise';

  -- Free Plan: No premium features
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled) VALUES
  (free_plan_id, 'scheduling', false),
  (free_plan_id, 'analytics', false),
  (free_plan_id, 'locations', false),
  (free_plan_id, 'media_youtube', false),
  (free_plan_id, 'media_google_slides', false),
  (free_plan_id, 'ai_analytics', false)
  ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

  -- Pro Plan: Most features enabled
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled) VALUES
  (pro_plan_id, 'scheduling', true),
  (pro_plan_id, 'analytics', true),
  (pro_plan_id, 'locations', true),
  (pro_plan_id, 'media_youtube', true),
  (pro_plan_id, 'media_google_slides', true),
  (pro_plan_id, 'ai_analytics', false)
  ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

  -- Enterprise Plan: All features enabled
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled) VALUES
  (enterprise_plan_id, 'scheduling', true),
  (enterprise_plan_id, 'analytics', true),
  (enterprise_plan_id, 'locations', true),
  (enterprise_plan_id, 'media_youtube', true),
  (enterprise_plan_id, 'media_google_slides', true),
  (enterprise_plan_id, 'ai_analytics', true)
  ON CONFLICT (plan_id, feature_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
END $$;
