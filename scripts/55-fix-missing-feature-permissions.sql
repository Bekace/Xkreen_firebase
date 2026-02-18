-- Fix missing feature permissions for Free and Pro plans
-- Ensures all plans have all 9 feature keys configured

DO $$
DECLARE
  free_plan_id UUID;
  pro_plan_id UUID;
  enterprise_plan_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free';
  SELECT id INTO pro_plan_id FROM subscription_plans WHERE name = 'Pro';
  SELECT id INTO enterprise_plan_id FROM subscription_plans WHERE name = 'Enterprise';

  -- Delete all existing feature permissions to start fresh
  DELETE FROM feature_permissions WHERE plan_id IN (free_plan_id, pro_plan_id, enterprise_plan_id);

  -- Free Plan: Basic features only (media_library, playlists, screens enabled)
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled) VALUES
  (free_plan_id, 'media_library', true),
  (free_plan_id, 'playlists', true),
  (free_plan_id, 'screens', true),
  (free_plan_id, 'locations', false),
  (free_plan_id, 'schedules', false),
  (free_plan_id, 'analytics', false),
  (free_plan_id, 'ai_analytics', false),
  (free_plan_id, 'team_members', false),
  (free_plan_id, 'url_media', true);

  -- Pro Plan: Most features enabled
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled) VALUES
  (pro_plan_id, 'media_library', true),
  (pro_plan_id, 'playlists', true),
  (pro_plan_id, 'screens', true),
  (pro_plan_id, 'locations', true),
  (pro_plan_id, 'schedules', true),
  (pro_plan_id, 'analytics', true),
  (pro_plan_id, 'ai_analytics', false),
  (pro_plan_id, 'team_members', true),
  (pro_plan_id, 'url_media', true);

  -- Enterprise Plan: All features enabled
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled) VALUES
  (enterprise_plan_id, 'media_library', true),
  (enterprise_plan_id, 'playlists', true),
  (enterprise_plan_id, 'screens', true),
  (enterprise_plan_id, 'locations', true),
  (enterprise_plan_id, 'schedules', true),
  (enterprise_plan_id, 'analytics', true),
  (enterprise_plan_id, 'ai_analytics', true),
  (enterprise_plan_id, 'team_members', true),
  (enterprise_plan_id, 'url_media', true);

END $$;
