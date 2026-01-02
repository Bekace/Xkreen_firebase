-- Update screens table orientation constraint to support all rotation options
-- This migration expands the orientation constraint to include rotation values
-- that match what the UI sends: landscape, portrait, rotate-90, rotate-180, rotate-270

-- Drop the existing constraint
ALTER TABLE public.screens 
DROP CONSTRAINT IF EXISTS screens_orientation_check;

-- Add the updated constraint with all rotation options
ALTER TABLE public.screens 
ADD CONSTRAINT screens_orientation_check 
CHECK (orientation IN ('landscape', 'portrait', 'rotate-90', 'rotate-180', 'rotate-270'));

-- Verify the constraint was applied
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'screens_orientation_check'
    ) THEN
        RAISE NOTICE 'Successfully updated screens orientation constraint';
    ELSE
        RAISE EXCEPTION 'Failed to create screens orientation constraint';
    END IF;
END $$;
