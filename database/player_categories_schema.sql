-- Player Categories Table
-- Stores skill tier assignments for registered players

CREATE TABLE IF NOT EXISTS player_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('S-Tier', 'A-Tier', 'B-Tier', 'Misc')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Ensure each player can only have one category per tournament
  UNIQUE(tournament_id, user_id)
);

-- Indexes for better query performance
CREATE INDEX idx_player_categories_tournament ON player_categories(tournament_id);
CREATE INDEX idx_player_categories_user ON player_categories(user_id);
CREATE INDEX idx_player_categories_category ON player_categories(category);

-- Row Level Security Policies
ALTER TABLE player_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view player categories for open tournaments
CREATE POLICY "Player categories are viewable by everyone"
  ON player_categories FOR SELECT
  USING (true);

-- Only tournament admin can insert/update/delete categories
CREATE POLICY "Tournament admin can manage player categories"
  ON player_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = player_categories.tournament_id
      AND tournaments.admin_id = auth.uid()
    )
  );

-- Function to get uncategorized players for a tournament
CREATE OR REPLACE FUNCTION get_uncategorized_players(tournament_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  discord_username TEXT,
  discord_avatar_url TEXT,
  aoe2insights_url TEXT,
  preferred_position TEXT,
  preferred_civs_flank JSONB,
  preferred_civs_pocket JSONB,
  preferred_maps JSONB,
  notes TEXT,
  registered_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    r.discord_username,
    r.discord_avatar_url,
    r.aoe2insights_url,
    r.preferred_position,
    r.preferred_civs_flank,
    r.preferred_civs_pocket,
    r.preferred_maps,
    r.notes,
    r.registered_at
  FROM registrations r
  WHERE r.tournament_id = tournament_uuid
  AND r.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM player_categories pc
    WHERE pc.tournament_id = tournament_uuid
    AND pc.user_id = r.user_id
  )
  ORDER BY r.registered_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get categorized players grouped by tier
CREATE OR REPLACE FUNCTION get_categorized_players(tournament_uuid UUID)
RETURNS TABLE (
  category TEXT,
  user_id UUID,
  discord_username TEXT,
  discord_avatar_url TEXT,
  aoe2insights_url TEXT,
  preferred_position TEXT,
  preferred_civs_flank JSONB,
  preferred_civs_pocket JSONB,
  preferred_maps JSONB,
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.category,
    r.user_id,
    r.discord_username,
    r.discord_avatar_url,
    r.aoe2insights_url,
    r.preferred_position,
    r.preferred_civs_flank,
    r.preferred_civs_pocket,
    r.preferred_maps,
    r.notes,
    pc.assigned_at
  FROM player_categories pc
  JOIN registrations r ON r.user_id = pc.user_id AND r.tournament_id = pc.tournament_id
  WHERE pc.tournament_id = tournament_uuid
  ORDER BY 
    CASE pc.category
      WHEN 'S-Tier' THEN 1
      WHEN 'A-Tier' THEN 2
      WHEN 'B-Tier' THEN 3
      WHEN 'Misc' THEN 4
    END,
    pc.assigned_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
