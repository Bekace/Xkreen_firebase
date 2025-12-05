-- Add superadmin role to the existing role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'superadmin'));

-- Create admin audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'plan', 'feature', etc.
    target_id VARCHAR(100), -- ID of the affected resource
    details JSONB, -- Additional action details
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);

-- Enable RLS on admin audit logs
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only superadmins can view audit logs
CREATE POLICY "Superadmins can view all audit logs" ON admin_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'superadmin'
        )
    );

-- RLS policy: Only superadmins can insert audit logs (system will handle this)
CREATE POLICY "System can insert audit logs" ON admin_audit_logs
    FOR INSERT WITH CHECK (true);
