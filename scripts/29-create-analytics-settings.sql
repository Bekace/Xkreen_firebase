-- Create analytics settings table for privacy and configuration
CREATE TABLE IF NOT EXISTS analytics_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  screen_id UUID REFERENCES screens(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  retention_days INTEGER DEFAULT 30,
  consent_required BOOLEAN DEFAULT true,
  sampling_rate INTEGER DEFAULT 5, -- seconds between captures
  privacy_mode BOOLEAN DEFAULT true, -- anonymize all data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(screen_id)
);

-- Enable RLS
ALTER TABLE analytics_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own analytics settings" ON analytics_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own analytics settings" ON analytics_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own analytics settings" ON analytics_settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own analytics settings" ON analytics_settings
  FOR DELETE USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_analytics_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_settings_updated_at
  BEFORE UPDATE ON analytics_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_settings_updated_at();

-- Insert default settings for existing screens
INSERT INTO analytics_settings (screen_id, user_id, enabled)
SELECT s.id, s.user_id, false
FROM screens s
WHERE NOT EXISTS (
  SELECT 1 FROM analytics_settings a WHERE a.screen_id = s.id
);
