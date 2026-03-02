CREATE OR REPLACE FUNCTION increment_purchased_screen_slots(p_subscription_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE user_subscriptions
  SET purchased_screen_slots = COALESCE(purchased_screen_slots, 0) + 1,
      updated_at = now()
  WHERE id = p_subscription_id;
$$;
