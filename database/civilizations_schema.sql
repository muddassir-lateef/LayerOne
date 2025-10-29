-- Civilizations Table
-- Stores all Age of Empires II civilizations with their images
-- These are global and used across all tournaments

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.civilizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_civilizations_active ON public.civilizations(is_active);
CREATE INDEX IF NOT EXISTS idx_civilizations_display_order ON public.civilizations(display_order);

-- RLS Policies
ALTER TABLE public.civilizations ENABLE ROW LEVEL SECURITY;

-- Everyone can view active civilizations
CREATE POLICY "Anyone can view active civilizations"
ON public.civilizations
FOR SELECT
USING (is_active = true);

-- Only authenticated users can view all civilizations (including inactive)
CREATE POLICY "Authenticated users can view all civilizations"
ON public.civilizations
FOR SELECT
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_civilizations_updated_at
  BEFORE UPDATE ON public.civilizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.civilizations IS 'All Age of Empires II civilizations available for drafting';
COMMENT ON COLUMN public.civilizations.name IS 'Civilization name (e.g., Britons, Franks, Mongols)';
COMMENT ON COLUMN public.civilizations.description IS 'Brief description or unique unit/bonus';
COMMENT ON COLUMN public.civilizations.image_url IS 'URL to civilization emblem/flag image in Supabase Storage';
COMMENT ON COLUMN public.civilizations.is_active IS 'Whether this civilization is currently available for drafting';
COMMENT ON COLUMN public.civilizations.display_order IS 'Order for displaying civilizations in UI';

-- Sample data (commented out - use upload script instead)
/*
INSERT INTO public.civilizations (name, description, image_url, display_order) VALUES
  ('Aztecs', 'Infantry civilization with strong Eagle Warriors', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/aztecs.png', 1),
  ('Britons', 'Foot archer civilization with Longbowmen', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/britons.png', 2),
  ('Byzantines', 'Defensive civilization with strong buildings', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/byzantines.png', 3),
  ('Celts', 'Infantry civilization with fast woodcutting', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/celts.png', 4),
  ('Chinese', 'Versatile civilization with extra villagers', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/chinese.png', 5),
  ('Franks', 'Cavalry civilization with strong Paladins', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/franks.png', 6),
  ('Goths', 'Infantry civilization with cheap units', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/goths.png', 7),
  ('Japanese', 'Infantry civilization with Samurai', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/japanese.png', 8),
  ('Mongols', 'Cavalry archer civilization with Mangudai', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/mongols.png', 9),
  ('Persians', 'Cavalry civilization with War Elephants', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/persians.png', 10),
  ('Saracens', 'Camel and naval civilization', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/saracens.png', 11),
  ('Teutons', 'Infantry civilization with strong defenses', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/teutons.png', 12),
  ('Turks', 'Gunpowder civilization with Janissaries', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/turks.png', 13),
  ('Vikings', 'Infantry and naval civilization', 'https://your-project.supabase.co/storage/v1/object/public/civ-images/vikings.png', 14);
  -- Add all 42+ civilizations from AoE2 DE...
*/

-- Helpful queries
-- View all civilizations
-- SELECT * FROM civilizations ORDER BY display_order;

-- Count total civilizations
-- SELECT COUNT(*) FROM civilizations;

-- Search civilizations
-- SELECT * FROM civilizations WHERE name ILIKE '%mongol%';
