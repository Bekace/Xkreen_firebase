-- Add storage_unit column to subscription_plans table
-- This allows plans to specify storage limits in different units (KB, MB, GB, TB, unlimited)

ALTER TABLE subscription_plans 
ADD COLUMN storage_unit text DEFAULT 'GB';

-- Update existing plans to use GB as the default unit
-- Convert existing max_media_storage values from bytes to GB for display consistency
UPDATE subscription_plans 
SET storage_unit = 'GB'
WHERE storage_unit IS NULL;

-- Add a check constraint to ensure valid storage units
ALTER TABLE subscription_plans 
ADD CONSTRAINT valid_storage_unit 
CHECK (storage_unit IN ('KB', 'MB', 'GB', 'TB', 'unlimited'));

-- Create an index for better query performance
CREATE INDEX idx_subscription_plans_storage_unit ON subscription_plans(storage_unit);
