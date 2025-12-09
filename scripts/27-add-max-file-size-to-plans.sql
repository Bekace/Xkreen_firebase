-- Add max_file_size column to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_file_size BIGINT DEFAULT 104857600; -- Default 100MB in bytes

-- Update existing plans with appropriate limits
UPDATE subscription_plans 
SET max_file_size = 52428800 -- 50MB
WHERE price = 0; -- Free plan

UPDATE subscription_plans 
SET max_file_size = 104857600 -- 100MB  
WHERE name = 'Pro' OR price = 28.99;

UPDATE subscription_plans 
SET max_file_size = 524288000 -- 500MB
WHERE name = 'Enterprises' OR price >= 99;
