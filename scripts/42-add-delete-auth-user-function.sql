-- Create a function to delete a user from auth.users
-- This allows deletion via RPC call with service role permissions
CREATE OR REPLACE FUNCTION delete_auth_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users (admin check is done in the API)
GRANT EXECUTE ON FUNCTION delete_auth_user TO service_role;
