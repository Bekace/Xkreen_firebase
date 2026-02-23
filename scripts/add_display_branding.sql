-- Add display_branding column to subscription_plans table
ALTER TABLE subscription_plans
ADD COLUMN display_branding BOOLEAN DEFAULT false;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' AND column_name = 'display_branding';
