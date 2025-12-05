-- Add max_playlists column to subscription_plans table
-- This maintains consistency with other limit columns like max_screens and max_storage_gb

ALTER TABLE subscription_plans 
ADD COLUMN max_playlists INTEGER DEFAULT 5;

-- Update existing plans with reasonable playlist limits
UPDATE subscription_plans 
SET max_playlists = CASE 
    WHEN name ILIKE '%free%' THEN 3
    WHEN name ILIKE '%basic%' THEN 10
    WHEN name ILIKE '%pro%' OR name ILIKE '%professional%' THEN 25
    WHEN name ILIKE '%enterprise%' THEN 100
    ELSE 5
END;

-- Create an index for better query performance
CREATE INDEX idx_subscription_plans_max_playlists ON subscription_plans(max_playlists);
