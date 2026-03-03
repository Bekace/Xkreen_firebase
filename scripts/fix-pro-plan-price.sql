-- Fix Pro plan pricing to use the new Stripe price ID
-- Replace 'price_XXX' with your actual new Stripe price ID from Stripe dashboard

-- First, mark any old Pro prices as inactive
UPDATE subscription_prices
SET is_active = false
WHERE plan_id = (SELECT id FROM subscription_plans WHERE name = 'Pro')
  AND billing_cycle = 'monthly'
  AND stripe_price_id != 'price_XXX'; -- Replace with your NEW price ID

-- Then update (or insert) the correct price with the new Stripe ID
UPDATE subscription_prices
SET stripe_price_id = 'price_XXX',  -- Replace with your NEW price ID from Stripe
    is_active = true,
    price = 29.99  -- Update to your new price if different
WHERE plan_id = (SELECT id FROM subscription_plans WHERE name = 'Pro')
  AND billing_cycle = 'monthly'
  AND stripe_price_id = 'price_1QfTJEbQfDGdRMOLRiJcdZy';  -- Replace with OLD price ID

-- If the above doesn't match any rows, you may need to insert a new price record:
-- INSERT INTO subscription_prices (plan_id, billing_cycle, price, stripe_price_id, is_active, trial_days)
-- SELECT id, 'monthly', 29.99, 'price_XXX', true, 0
-- FROM subscription_plans
-- WHERE name = 'Pro'
-- AND NOT EXISTS (
--   SELECT 1 FROM subscription_prices sp
--   WHERE sp.plan_id = subscription_plans.id
--     AND sp.billing_cycle = 'monthly'
--     AND sp.is_active = true
-- );
