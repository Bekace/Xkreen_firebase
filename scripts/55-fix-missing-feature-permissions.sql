-- Fix missing feature permissions for Free, Standard, and Pro plans
-- Ensures all plans have all 9 feature keys configured

DO $$
DECLARE
  free_plan_id UUID;
  standard_plan_id UUID;
  pro_plan_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free';
  SELECT id INTO standard_plan_id FROM subscription_plans WHERE name = 'Standard';
  SELECT id INTO pro_plan_id FROM subscription_plans WHERE name = 'Pro';

  -- Delete all existing feature permissions to start fresh
  DELETE FROM feature_permissions;

  -- Free Plan: Basic features only
  IF free_plan_id IS NOT NULL THEN
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
  END IF;

  -- Standard Plan: Most features enabled
  IF standard_plan_id IS NOT NULL THEN
    INSERT INTO feature_permissions (plan_id, feature_key, is_enabled) VALUES
    (standard_plan_id, 'media_library', true),
    (standard_plan_id, 'playlists', true),
    (standard_plan_id, 'screens', true),
    (standard_plan_id, 'locations', true),
    (standard_plan_id, 'schedules', true),
    (standard_plan_id, 'analytics', true),
    (standard_plan_id, 'ai_analytics', false),
    (standard_plan_id, 'team_members', true),
    (standard_plan_id, 'url_media', true);
  END IF;

  -- Pro Plan: All features enabled
  IF pro_plan_id IS NOT NULL THEN
    INSERT INTO feature_permissions (plan_id, feature_key, is_enabled) VALUES
    (pro_plan_id, 'media_library', true),
    (pro_plan_id, 'playlists', true),
    (pro_plan_id, 'screens', true),
    (pro_plan_id, 'locations', true),
    (pro_plan_id, 'schedules', true),
    (pro_plan_id, 'analytics', true),
    (pro_plan_id, 'ai_analytics', true),
    (pro_plan_id, 'team_members', true),
    (pro_plan_id, 'url_media', true);
  END IF;

END $$;
