-- =====================================================
-- AoE2 Tournament Manager - Database Schema
-- Phase 1: Tournament Creation
-- =====================================================

-- Enable UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TOURNAMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tournament Configuration
  format TEXT NOT NULL DEFAULT 'round_robin_gf'
    CHECK (format IN ('round_robin_gf')),
    -- Currently only Round Robin with Grand Final
    -- Future: 'single_elimination', 'double_elimination', etc.
  
  team_size INTEGER NOT NULL DEFAULT 3
    CHECK (team_size > 0),
    -- Currently fixed at 3, but allows future flexibility
  
  -- Tournament Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed')),
  
  -- Future Features (nullable for now)
  registration_deadline TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tournaments_admin_id ON public.tournaments(admin_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_at ON public.tournaments(created_at DESC);

-- =====================================================
-- TOURNAMENT_SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tournament_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  
  -- Match Format Settings
  round_robin_format TEXT NOT NULL DEFAULT 'ap3'
    CHECK (round_robin_format IN ('ap3', 'bo1', 'bo3', 'bo5')),
    -- 'ap3' = All Played 3 (always play 3 games, winner by best score)
    -- Default for Phase 1
  
  semifinal_format TEXT NOT NULL DEFAULT 'bo3'
    CHECK (semifinal_format IN ('bo1', 'bo3', 'bo5', 'bo7')),
    -- Best of 3 for semifinals
  
  grandfinal_format TEXT NOT NULL DEFAULT 'bo5'
    CHECK (grandfinal_format IN ('bo1', 'bo3', 'bo5', 'bo7')),
    -- Best of 5 for grand final
  
  -- Future Configuration Fields (not used in Phase 1)
  map_pool_id UUID,
  civ_draft_enabled BOOLEAN DEFAULT false,
  civ_bans_per_team INTEGER,
  custom_settings JSONB,
    -- For any future custom configurations
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one settings record per tournament
  UNIQUE(tournament_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tournament_settings_tournament_id ON public.tournament_settings(tournament_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tournaments table
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view non-draft tournaments
CREATE POLICY "Public tournaments are viewable by everyone"
  ON public.tournaments
  FOR SELECT
  USING (status != 'draft');

-- Policy: Authenticated users can view their own draft tournaments
CREATE POLICY "Users can view their own tournaments"
  ON public.tournaments
  FOR SELECT
  USING (auth.uid() = admin_id);

-- Policy: Authenticated users can create tournaments
CREATE POLICY "Authenticated users can create tournaments"
  ON public.tournaments
  FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

-- Policy: Admins can update their own tournaments
CREATE POLICY "Admins can update their own tournaments"
  ON public.tournaments
  FOR UPDATE
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

-- Policy: Admins can delete their own tournaments
CREATE POLICY "Admins can delete their own tournaments"
  ON public.tournaments
  FOR DELETE
  USING (auth.uid() = admin_id);

-- Enable RLS on tournament_settings table
ALTER TABLE public.tournament_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Settings follow tournament visibility
CREATE POLICY "Tournament settings follow tournament visibility"
  ON public.tournament_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_settings.tournament_id
      AND (tournaments.status != 'draft' OR tournaments.admin_id = auth.uid())
    )
  );

-- Policy: Settings can be created by tournament admin
CREATE POLICY "Tournament admins can create settings"
  ON public.tournament_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_settings.tournament_id
      AND tournaments.admin_id = auth.uid()
    )
  );

-- Policy: Settings can be updated by tournament admin
CREATE POLICY "Tournament admins can update settings"
  ON public.tournament_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_settings.tournament_id
      AND tournaments.admin_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tournaments table
DROP TRIGGER IF EXISTS tournaments_updated_at ON public.tournaments;
CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for tournament_settings table
DROP TRIGGER IF EXISTS tournament_settings_updated_at ON public.tournament_settings;
CREATE TRIGGER tournament_settings_updated_at
  BEFORE UPDATE ON public.tournament_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- TRIGGER: Auto-create tournament settings
-- =====================================================

-- Function to create default tournament settings
CREATE OR REPLACE FUNCTION public.handle_new_tournament()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tournament_settings (
    tournament_id,
    round_robin_format,
    semifinal_format,
    grandfinal_format
  ) VALUES (
    NEW.id,
    'ap3',  -- Round robin: All Played 3
    'bo3',  -- Semifinals: Best of 3
    'bo5'   -- Grand final: Best of 5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create settings when tournament is created
DROP TRIGGER IF EXISTS on_tournament_created ON public.tournaments;
CREATE TRIGGER on_tournament_created
  AFTER INSERT ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tournament();

-- =====================================================
-- HELPFUL QUERIES FOR TESTING
-- =====================================================

-- View all tournaments with their settings
-- SELECT 
--   t.id,
--   t.name,
--   t.description,
--   t.status,
--   t.format,
--   t.team_size,
--   ts.round_robin_format,
--   ts.semifinal_format,
--   ts.grandfinal_format,
--   t.created_at
-- FROM public.tournaments t
-- LEFT JOIN public.tournament_settings ts ON t.id = ts.tournament_id
-- ORDER BY t.created_at DESC;

-- View user's tournaments
-- SELECT * FROM public.tournaments 
-- WHERE admin_id = auth.uid()
-- ORDER BY created_at DESC;
