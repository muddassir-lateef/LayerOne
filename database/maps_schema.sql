-- =====================================================
-- Maps Table for AoE2 Tournament Manager
-- Stores available AoE2 maps with images and descriptions
-- =====================================================

-- =====================================================
-- MAPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT NOT NULL,
  -- Image stored in Supabase Storage
  
  is_active BOOLEAN DEFAULT true,
  -- Allow disabling maps without deleting
  
  display_order INTEGER DEFAULT 0,
  -- For custom ordering in UI
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_maps_active ON public.maps(is_active);
CREATE INDEX IF NOT EXISTS idx_maps_display_order ON public.maps(display_order);

-- =====================================================
-- TOURNAMENT_MAPS (Junction Table)
-- Links tournaments to selected maps
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tournament_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  
  -- Unique constraint: each map can only be added once per tournament
  UNIQUE(tournament_id, map_id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tournament_maps_tournament ON public.tournament_maps(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_maps_map ON public.tournament_maps(map_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Maps table - everyone can read, only admins can modify
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active maps
CREATE POLICY "Active maps are viewable by everyone"
  ON public.maps
  FOR SELECT
  USING (is_active = true);

-- Policy: Only authenticated users can view all maps (including inactive)
CREATE POLICY "Authenticated users can view all maps"
  ON public.maps
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: INSERT/UPDATE/DELETE policies for maps can be added later for platform admins

-- Tournament maps table
ALTER TABLE public.tournament_maps ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view tournament maps for public tournaments
CREATE POLICY "Tournament maps are publicly viewable"
  ON public.tournament_maps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_maps.tournament_id
      AND (tournaments.status != 'draft' OR tournaments.admin_id = auth.uid())
    )
  );

-- Policy: Tournament admins can manage their tournament maps
CREATE POLICY "Tournament admins can manage their maps"
  ON public.tournament_maps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_maps.tournament_id
      AND tournaments.admin_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at for maps
DROP TRIGGER IF EXISTS maps_updated_at ON public.maps;
CREATE TRIGGER maps_updated_at
  BEFORE UPDATE ON public.maps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- SAMPLE DATA - Popular AoE2 Maps
-- =====================================================

-- Note: Run this AFTER uploading images to Supabase Storage
-- Replace 'your-bucket-url' with actual Supabase Storage URLs

/*
INSERT INTO public.maps (name, description, image_url, display_order) VALUES
  ('Arabia', 'Open map with few resources. A classic competitive map requiring strong early game and micro management.', 'your-bucket-url/arabia.jpg', 1),
  ('Arena', 'Closed map with stone walls. Allows for safer booming and later game strategies.', 'your-bucket-url/arena.jpg', 2),
  ('Nomad', 'Start without a Town Center. Must find a good location and build quickly.', 'your-bucket-url/nomad.jpg', 3),
  ('Black Forest', 'Dense forests limit early aggression. Favors defensive and boom strategies.', 'your-bucket-url/blackforest.jpg', 4),
  ('Islands', 'Naval-focused map. Requires strong water control and transport management.', 'your-bucket-url/islands.jpg', 5),
  ('Hideout', 'Unique layout with central area. Encourages map control and positioning.', 'your-bucket-url/hideout.jpg', 6),
  ('Runestones', 'Open map with central relics. Combines aggression with relic control.', 'your-bucket-url/runestones.jpg', 7),
  ('Golden Pit', 'Open map with gold in center. Encourages aggressive play for resources.', 'your-bucket-url/goldenpit.jpg', 8),
  ('Socotra', 'Hybrid map with land and water. Requires versatile strategies.', 'your-bucket-url/socotra.jpg', 9);
*/

-- =====================================================
-- HELPFUL QUERIES
-- =====================================================

-- View all active maps
-- SELECT * FROM public.maps WHERE is_active = true ORDER BY display_order;

-- View maps for a specific tournament
-- SELECT m.* FROM public.maps m
-- JOIN public.tournament_maps tm ON m.id = tm.map_id
-- WHERE tm.tournament_id = 'your-tournament-id'
-- ORDER BY m.display_order;

-- Count tournaments using each map
-- SELECT m.name, COUNT(tm.tournament_id) as tournament_count
-- FROM public.maps m
-- LEFT JOIN public.tournament_maps tm ON m.id = tm.map_id
-- GROUP BY m.id, m.name
-- ORDER BY tournament_count DESC;
