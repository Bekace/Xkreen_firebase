-- Step 1: Drop the incorrectly created proof_of_play table
DROP TABLE IF EXISTS public.proof_of_play;

-- Step 2: Create the new devices table to link devices to users
CREATE TABLE IF NOT EXISTS public.proof_of_play_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policies for the devices table
ALTER TABLE public.proof_of_play_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own proof of play devices" 
ON public.proof_of_play_devices
FOR ALL USING (auth.uid() = user_id);

-- Create indexes and triggers for the devices table
CREATE INDEX IF NOT EXISTS idx_pop_devices_user_id ON public.proof_of_play_devices(user_id);
CREATE TRIGGER update_proof_of_play_devices_updated_at BEFORE UPDATE ON public.proof_of_play_devices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 3: Re-create the proof_of_play table correctly
CREATE TABLE IF NOT EXISTS public.proof_of_play (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    device_id UUID REFERENCES public.proof_of_play_devices(id) ON DELETE CASCADE NOT NULL,
    media_id UUID REFERENCES public.media(id) ON DELETE SET NULL, -- Use SET NULL to keep play history even if media is deleted
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL, -- Same for playlists
    play_type VARCHAR(10) CHECK (play_type IN ('online', 'offline')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS and create policies for the proof_of_play table
ALTER TABLE public.proof_of_play ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own proof of play events"
ON public.proof_of_play
FOR ALL USING (auth.uid() = user_id);

-- Create indexes for the proof_of_play table for performance
CREATE INDEX IF NOT EXISTS idx_pop_user_id ON public.proof_of_play(user_id);
CREATE INDEX IF NOT EXISTS idx_pop_device_id ON public.proof_of_play(device_id);
CREATE INDEX IF NOT EXISTS idx_pop_created_at ON public.proof_of_play(created_at);
