-- Add new columns to subscription_plans for additional limits
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_file_upload_size BIGINT DEFAULT 104857600, -- 100MB default
ADD COLUMN IF NOT EXISTS max_locations INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_schedules INTEGER DEFAULT 1;

-- Update existing plans with reasonable defaults based on plan tier
DO $$
DECLARE
  free_plan_id UUID;
  pro_plan_id UUID;
  enterprise_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free';
  SELECT id INTO pro_plan_id FROM subscription_plans WHERE name = 'Pro';
  SELECT id INTO enterprise_plan_id FROM subscription_plans WHERE name = 'Enterprise';

  -- Free Plan: Limited
  UPDATE subscription_plans 
  SET 
    max_file_upload_size = 52428800, -- 50MB
    max_locations = 1,
    max_schedules = 1
  WHERE id = free_plan_id;

  -- Pro Plan: Moderate
  UPDATE subscription_plans 
  SET 
    max_file_upload_size = 524288000, -- 500MB
    max_locations = 10,
    max_schedules = 20
  WHERE id = pro_plan_id;

  -- Enterprise Plan: Unlimited
  UPDATE subscription_plans 
  SET 
    max_file_upload_size = -1, -- Unlimited
    max_locations = -1,
    max_schedules = -1
  WHERE id = enterprise_plan_id;

  -- Now add comprehensive feature permissions for navigation visibility
  -- Delete old incomplete feature permissions
  DELETE FROM feature_permissions WHERE plan_id IN (free_plan_id, pro_plan_id, enterprise_plan_id);

  -- Free Plan: Minimal features
  INSERT INTO feature_permissions (plan_id, feature_key, is_enabled) VALUES
  (free_plan_id, 'media_library', true),
  (free_plan_id, 'playlists', true),
  (free_plan_id, 'screens', true),
  (free_plan_id, 'locations', false),
  (free_plan_id, 'schedules', false),
  (free_plan_id, 'analytics', false),
  (free_plan_id, 'ai_analytics', false),
  (free_plan_id, 'team_members', false),
  (free_plan_id, 'url_media', false); -- No YouTube/Google Slides

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
  (pro_plan_id, 'url_media', true); -- YouTube/Google Slides enabled

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
  (enterprise_plan_id, 'url_media', true); -- YouTube/Google Slides enabled

END $$;
