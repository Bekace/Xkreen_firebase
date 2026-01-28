-- Geocode locations that are missing latitude/longitude
-- This script identifies locations that need geocoding

-- First, let's see which locations are missing coordinates
SELECT id, name, address, city, state, zip_code
FROM locations
WHERE latitude IS NULL OR longitude IS NULL;

-- Note: Actual geocoding must be done via the Google Geocoding API
-- The Next.js API endpoint at /api/locations/[id] will auto-geocode when you update a location
-- Or you can use the frontend to edit and save each location to trigger geocoding
