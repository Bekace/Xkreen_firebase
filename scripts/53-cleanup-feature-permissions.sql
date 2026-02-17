-- Clean up feature permissions to only include features that actually exist
-- Remove: sessions, statistics, schedules (schedules is part of scheduling)
-- Keep: scheduling, analytics, locations, media_youtube, media_google_slides, ai_analytics

-- Delete non-existent features
DELETE FROM feature_permissions 
WHERE feature_key IN ('sessions', 'statistics', 'schedules');

-- Ensure all plans have the correct feature permissions
-- Get plan IDs
DO $$
DECLARE
  free_plan_id uuid;
  pro_plan_id uuid;
  enterprise_plan_id uuid;
BEGIN
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free';
  SELECT id INTO pro_plan_id FROM subscription_plans WHERE name = 'Pro';
  SELECT id INTO enterprise_plan_id FROM subscription_plans WHERE name = 'Enterprise';

  -- Clear existing and insert correct permissions
  DELETE FROM feature_permissions;

  -- Free Plan: Basic features only
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled, description) VALUES
  (free_plan_id, 'scheduling', false, 'Content scheduling'),
  (free_plan_id, 'analytics', false, 'Analytics dashboard'),
  (free_plan_id, 'locations', false, 'Location management'),
  (free_plan_id, 'media_youtube', false, 'YouTube videos'),
  (free_plan_id, 'media_google_slides', false, 'Google Slides'),
  (free_plan_id, 'ai_analytics', false, 'AI-powered analytics');

  -- Pro Plan: Most features enabled
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled, description) VALUES
  (pro_plan_id, 'scheduling', true, 'Content scheduling'),
  (pro_plan_id, 'analytics', true, 'Analytics dashboard'),
  (pro_plan_id, 'locations', true, 'Location management'),
  (pro_plan_id, 'media_youtube', true, 'YouTube videos'),
  (pro_plan_id, 'media_google_slides', true, 'Google Slides'),
  (pro_plan_id, 'ai_analytics', false, 'AI-powered analytics');

  -- Enterprise Plan: All features enabled
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled, description) VALUES
  (enterprise_plan_id, 'scheduling', true, 'Content scheduling'),
  (enterprise_plan_id, 'analytics', true, 'Analytics dashboard'),
  (enterprise_plan_id, 'locations', true, 'Location management'),
  (enterprise_plan_id, 'media_youtube', true, 'YouTube videos'),
  (enterprise_plan_id, 'media_google_slides', true, 'Google Slides'),
  (enterprise_plan_id, 'ai_analytics', true, 'AI-powered analytics');
END $$;
