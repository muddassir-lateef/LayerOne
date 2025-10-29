-- Registration System Schema
-- Stores player registrations for tournaments

-- Drop existing table if recreating
-- DROP TABLE IF EXISTS public.registrations CASCADE;

-- Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Player Information
  aoe2insights_url text NOT NULL,
  discord_username text NOT NULL,
  discord_avatar_url text,
  
  -- Preferred Civilizations
  preferred_civs_flank jsonb DEFAULT '[]'::jsonb, -- Array of 2 civ names for flank position
  preferred_civs_pocket jsonb DEFAULT '[]'::jsonb, -- Array of 2 civ names for pocket position
  
  -- Preferred Position
  preferred_position text NOT NULL CHECK (preferred_position IN ('flank', 'pocket')),
  
  -- Preferred Maps (top 3 from tournament map pool)
  preferred_maps jsonb DEFAULT '[]'::jsonb, -- Array of up to 3 map names
  
  -- Additional Info
  notes text,
  
  -- Status
  status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Timestamps
  registered_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one registration per user per tournament
  UNIQUE(tournament_id, user_id)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON public.registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(status);

-- Enable Row Level Security
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view approved registrations for non-draft tournaments
CREATE POLICY "Public can view approved registrations"
  ON public.registrations
  FOR SELECT
  USING (
    status = 'approved' 
    AND EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = registrations.tournament_id 
      AND tournaments.status != 'draft'
    )
  );

-- Authenticated users can view their own registrations
CREATE POLICY "Users can view own registrations"
  ON public.registrations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Tournament admins can view all registrations for their tournaments
CREATE POLICY "Admins can view tournament registrations"
  ON public.registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = registrations.tournament_id 
      AND tournaments.admin_id = auth.uid()
    )
  );

-- Authenticated users can register for open tournaments
CREATE POLICY "Users can register for open tournaments"
  ON public.registrations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_id 
      AND tournaments.status = 'registration_open'
    )
  );

-- Users can update their own registrations (before tournament starts)
CREATE POLICY "Users can update own registrations"
  ON public.registrations
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_id 
      AND tournaments.status = 'registration_open'
    )
  );

-- Users can delete their own registrations (withdraw)
CREATE POLICY "Users can delete own registrations"
  ON public.registrations
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_id 
      AND tournaments.status = 'registration_open'
    )
  );

-- Tournament admins can update registration status
CREATE POLICY "Admins can update registration status"
  ON public.registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_id 
      AND tournaments.admin_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT SELECT ON public.registrations TO anon;
