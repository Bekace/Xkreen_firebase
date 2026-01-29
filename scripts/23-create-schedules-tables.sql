-- Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedule_items table (defines time slots and content)
CREATE TABLE IF NOT EXISTS public.schedule_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('playlist', 'media')),
    content_id UUID NOT NULL, -- References either playlists.id or media.id
    
    -- Recurrence pattern (using RRule format or simple patterns)
    recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
    recurrence_rule TEXT, -- Store RRule string for complex patterns
    
    -- Time range
    start_date DATE NOT NULL,
    end_date DATE, -- NULL means no end date
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Days of week (for weekly recurrence)
    days_of_week INTEGER[], -- Array of 0-6 (Sunday=0, Saturday=6)
    
    -- Priority for handling conflicts
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create screen_schedules table (assigns schedules to screens)
CREATE TABLE IF NOT EXISTS public.screen_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    screen_id UUID REFERENCES public.screens(id) ON DELETE CASCADE NOT NULL,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(screen_id, schedule_id)
);

-- Enable Row Level Security
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for schedules
CREATE POLICY "Users can manage own schedules" ON public.schedules
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for schedule_items
CREATE POLICY "Users can manage own schedule items" ON public.schedule_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.schedules 
            WHERE schedules.id = schedule_items.schedule_id 
            AND schedules.user_id = auth.uid()
        )
    );

-- Create RLS policies for screen_schedules
CREATE POLICY "Users can manage screen schedules" ON public.screen_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.screens 
            WHERE screens.id = screen_schedules.screen_id 
            AND screens.user_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_schedule_id ON public.schedule_items(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_dates ON public.schedule_items(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_items_time ON public.schedule_items(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_screen_schedules_screen_id ON public.screen_schedules(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_schedules_schedule_id ON public.screen_schedules(schedule_id);

-- Create triggers for updated_at
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_items_updated_at BEFORE UPDATE ON public.schedule_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for clarity
COMMENT ON TABLE public.schedules IS 'Schedules that define time-based content delivery';
COMMENT ON TABLE public.schedule_items IS 'Individual time slots and content assignments within a schedule';
COMMENT ON TABLE public.screen_schedules IS 'Assignment of schedules to screens';
COMMENT ON COLUMN public.schedule_items.recurrence_type IS 'Type of recurrence: once, daily, weekly, monthly, custom';
COMMENT ON COLUMN public.schedule_items.recurrence_rule IS 'RRule string for complex recurrence patterns';
COMMENT ON COLUMN public.schedule_items.days_of_week IS 'Array of days (0=Sunday, 6=Saturday) for weekly recurrence';
COMMENT ON COLUMN public.schedule_items.priority IS 'Priority for conflict resolution (higher = takes precedence)';
