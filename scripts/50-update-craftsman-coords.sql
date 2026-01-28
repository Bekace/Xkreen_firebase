-- Update The Craftsman location with geocoded coordinates
-- Address: 3155 Broadway, New York, NY 10027

UPDATE locations
SET 
  latitude = 40.8166437,
  longitude = -73.9627853
WHERE name = 'The Craftsman'
  AND latitude IS NULL 
  AND longitude IS NULL;
