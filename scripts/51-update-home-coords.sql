-- Update Home location with geocoded coordinates
-- Address: 323 E Mosholu Pkwy N, Bronx, NY 10467

UPDATE locations
SET 
  latitude = 40.872049,
  longitude = -73.87998429999999
WHERE name = 'Home'
  AND latitude IS NULL 
  AND longitude IS NULL;
