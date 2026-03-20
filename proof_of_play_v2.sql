--
-- A clean table for storing pre-calculated Proof of Play data, based on the user's defined logic.
-- This approach avoids re-calculating everything on every request, ensuring performance and scalability.
--

-- Drop the old table and all its dependencies (indexes, policies) if it exists.
DROP TABLE IF EXISTS public.proof_of_play CASCADE;

CREATE TABLE public.proof_of_play (
  -- A unique identifier for this specific playback. Created on media_start.
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys to connect this play to the rest of the system.
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- LOGIC: "media start and media end. Both conditions must be met."
  -- These two columns directly model that requirement.
  start_time TIMESTAMPTZ NOT NULL, -- Set when the media_start event is processed.
  end_time TIMESTAMPTZ,              -- Set when the matching media_end event is processed.

  -- LOGIC: "Validate the screen status (online or offline)."
  -- This is the server-verified status at the moment the play started.
  play_type TEXT NOT NULL, -- 'online' or 'offline', determined by checking devices.last_heartbeat.

  -- LOGIC: "confirms that a piece of media actually started and finished playing."
  -- This flag is the final source of truth for a "confirmed play".
  is_complete BOOLEAN NOT NULL DEFAULT FALSE, -- Set to TRUE only when end_time is set.

  -- A helpful, calculated value for analytics.
  duration_seconds INTEGER, -- Calculated as (end_time - start_time).

  -- Standard auditing timestamps.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proof_of_play IS 'Stores pre-calculated playback data. One row represents one complete media playback session.';
COMMENT ON COLUMN public.proof_of_play.is_complete IS 'Set to TRUE only when a matching media_end event is processed for a media_start. This is the primary filter for counting plays.';
COMMENT ON COLUMN public.proof_of_play.play_type IS 'Server-verified device status (online/offline) at the time of playback.';


-- Create indexes for the exact queries the stats dashboard will run.
-- This ensures the dashboard remains fast.
CREATE INDEX idx_pop_analytics_queries ON public.proof_of_play(user_id, is_complete, play_type);
CREATE INDEX idx_pop_find_incomplete ON public.proof_of_play(device_id, media_id, is_complete) WHERE is_complete = FALSE;


-- Enable Row-Level Security for data protection.
ALTER TABLE public.proof_of_play ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own data.
CREATE POLICY "Allow users to access their own proof_of_play data" 
ON public.proof_of_play
FOR ALL
USING (auth.uid() = user_id);


-- A standard trigger to update the `updated_at` column automatically.
CREATE OR REPLACE FUNCTION handle_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_proof_of_play_updated
  BEFORE UPDATE
  ON public.proof_of_play
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();
