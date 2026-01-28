-- Update The Craftsman location with geocoded coordinates
-- Address: 3155 Broadway, New York, NY 10027
-- Coordinates obtained from Google Geocoding API

UPDATE locations 
SET 
  latitude = 40.8166437,
  longitude = -73.9627853
WHERE id = '3478db47-7509-43c7-b908-fdc247db4692';

-- Verify the update
SELECT id, name, address, city, state, latitude, longitude 
FROM locations 
WHERE id = '3478db47-7509-43c7-b908-fdc247db4692';
