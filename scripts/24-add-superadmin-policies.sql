-- Add RLS policies for superadmin access to all tables

-- Superadmin access to profiles table
CREATE POLICY "Superadmins can manage all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'superadmin'
        )
    );

-- Superadmin access to subscription_plans
CREATE POLICY "Superadmins can manage subscription plans" ON subscription_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'superadmin'
        )
    );

-- Superadmin access to user_subscriptions
CREATE POLICY "Superadmins can manage user subscriptions" ON user_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'superadmin'
        )
    );

-- Superadmin access to feature_permissions
CREATE POLICY "Superadmins can manage feature permissions" ON feature_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'superadmin'
        )
    );

-- Superadmin access to analytics
CREATE POLICY "Superadmins can view all analytics" ON analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'superadmin'
        )
    );
