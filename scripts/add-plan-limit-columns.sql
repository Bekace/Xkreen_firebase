-- Add new limit columns to subscription_plans table
-- max_analytics_screens: Number of screens that can have analytics enabled (-1 = unlimited)
-- max_team_members: Number of team members that can be invited (-1 = unlimited)

ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_analytics_screens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_team_members INTEGER DEFAULT 0;

-- Update existing plans with appropriate limits
-- Free Plan: 0 (none)
UPDATE subscription_plans 
SET 
  max_analytics_screens = 0,
  max_team_members = 0
WHERE name = 'Free';

-- Pro Plan: 2 each
UPDATE subscription_plans 
SET 
  max_analytics_screens = 2,
  max_team_members = 2
WHERE name = 'Pro';

-- Enterprise Plan: unlimited (-1)
UPDATE subscription_plans 
SET 
  max_analytics_screens = -1,
  max_team_members = -1
WHERE name = 'Enterprise';

-- Verify the changes
SELECT 
  name,
  max_screens,
  max_playlists,
  max_analytics_screens,
  max_team_members,
  max_media_storage
FROM subscription_plans
ORDER BY price;
