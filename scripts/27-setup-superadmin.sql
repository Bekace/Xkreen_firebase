-- Setup superadmin for testing
-- This script promotes the first user to superadmin role
-- Run this after creating your account

UPDATE profiles 
SET role = 'superadmin' 
WHERE id = (
  SELECT id 
  FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Verify the update
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'superadmin';
