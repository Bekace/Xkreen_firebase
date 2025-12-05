-- Add 'audience_analytics' to the allowed event types in the analytics table
ALTER TABLE public.analytics 
DROP CONSTRAINT IF EXISTS analytics_event_type_check;

ALTER TABLE public.analytics 
ADD CONSTRAINT analytics_event_type_check 
CHECK (event_type IN ('media_start', 'media_end', 'screen_online', 'screen_offline', 'error', 'audience_analytics'));
