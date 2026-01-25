-- Create locations table with hierarchy support
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    contact_person VARCHAR(255),
    phone_number VARCHAR(50),
    operating_hours TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create junction table for many-to-many relationship between screens and locations
CREATE TABLE IF NOT EXISTS public.screen_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(screen_id, location_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON public.locations(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON public.locations(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON public.locations(status);
CREATE INDEX IF NOT EXISTS idx_screen_locations_screen_id ON public.screen_locations(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_locations_location_id ON public.screen_locations(location_id);

-- Enable Row Level Security
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for locations
CREATE POLICY "Users can view their own locations"
    ON public.locations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own locations"
    ON public.locations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations"
    ON public.locations
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locations"
    ON public.locations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can view all locations
CREATE POLICY "Admins can view all locations"
    ON public.locations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Admins can manage all locations
CREATE POLICY "Admins can manage all locations"
    ON public.locations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Create RLS policies for screen_locations junction table
CREATE POLICY "Users can view their own screen locations"
    ON public.screen_locations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.screens
            WHERE screens.id = screen_locations.screen_id
            AND screens.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can assign screens to their locations"
    ON public.screen_locations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.screens
            WHERE screens.id = screen_locations.screen_id
            AND screens.user_id = auth.uid()
        )
        AND
        EXISTS (
            SELECT 1 FROM public.locations
            WHERE locations.id = screen_locations.location_id
            AND locations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove screens from their locations"
    ON public.screen_locations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.screens
            WHERE screens.id = screen_locations.screen_id
            AND screens.user_id = auth.uid()
        )
    );

-- Admins can view all screen locations
CREATE POLICY "Admins can view all screen locations"
    ON public.screen_locations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Admins can manage all screen locations
CREATE POLICY "Admins can manage all screen locations"
    ON public.screen_locations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Add location management feature to subscription plans
INSERT INTO public.feature_permissions (plan_id, feature_key, is_enabled, limit_value)
SELECT 
    sp.id,
    'location_management',
    CASE 
        WHEN sp.name = 'Free' THEN false
        ELSE true
    END,
    CASE 
        WHEN sp.name = 'Free' THEN 0
        WHEN sp.name IN ('Pro', 'Pro Monthly', 'Pro Yearly') THEN 25
        WHEN sp.name IN ('Enterprise', 'Enterprise Monthly', 'Enterprise Yearly', 'Ultra', 'Ultra Monthly', 'Ultra Yearly') THEN NULL  -- Unlimited
    END
FROM public.subscription_plans sp
WHERE NOT EXISTS (
    SELECT 1 FROM public.feature_permissions fp
    WHERE fp.plan_id = sp.id
    AND fp.feature_key = 'location_management'
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION update_locations_updated_at();
