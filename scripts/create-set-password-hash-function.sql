-- Function to set password hash directly on auth.users
-- This is needed because admin.createUser doesn't accept pre-hashed passwords

CREATE OR REPLACE FUNCTION set_user_password_hash(user_id UUID, password_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = password_hash
  WHERE id = user_id;
END;
$$;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION set_user_password_hash FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_user_password_hash TO service_role;
