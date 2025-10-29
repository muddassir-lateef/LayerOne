-- ============================================
-- Matches Schema for Tournament Bracket System
-- ============================================

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('round_robin', 'semifinal', 'grandfinal')),
  round INTEGER,
  match_number INTEGER NOT NULL,
  team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'disputed')),
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  best_of INTEGER NOT NULL DEFAULT 1,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match games table (for tracking individual games within a match)
CREATE TABLE IF NOT EXISTS match_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  map TEXT,
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  notes TEXT,
  played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedule proposals table (for captain-driven scheduling - Phase 2)
CREATE TABLE IF NOT EXISTS schedule_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'countered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_team1 ON matches(team1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2 ON matches(team2_id);
CREATE INDEX IF NOT EXISTS idx_match_games_match ON match_games(match_id);
CREATE INDEX IF NOT EXISTS idx_schedule_proposals_match ON schedule_proposals(match_id);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matches

-- Anyone can view matches
CREATE POLICY "Public can view matches"
ON matches FOR SELECT
USING (true);

-- Only tournament admins can create matches
CREATE POLICY "Tournament admins can create matches"
ON matches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments
    WHERE tournaments.id = matches.tournament_id
    AND tournaments.admin_id = auth.uid()
  )
);

-- Only tournament admins can update matches
CREATE POLICY "Tournament admins can update matches"
ON matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tournaments
    WHERE tournaments.id = matches.tournament_id
    AND tournaments.admin_id = auth.uid()
  )
);

-- Only tournament admins can delete matches
CREATE POLICY "Tournament admins can delete matches"
ON matches FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tournaments
    WHERE tournaments.id = matches.tournament_id
    AND tournaments.admin_id = auth.uid()
  )
);

-- RLS Policies for match_games

-- Anyone can view match games
CREATE POLICY "Public can view match games"
ON match_games FOR SELECT
USING (true);

-- Only tournament admins can manage match games
CREATE POLICY "Tournament admins can manage match games"
ON match_games FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM matches
    JOIN tournaments ON tournaments.id = matches.tournament_id
    WHERE matches.id = match_games.match_id
    AND tournaments.admin_id = auth.uid()
  )
);

-- RLS Policies for schedule_proposals (Phase 2 feature)

-- Anyone can view proposals
CREATE POLICY "Public can view schedule proposals"
ON schedule_proposals FOR SELECT
USING (true);

-- Captains and admins can create proposals
CREATE POLICY "Captains can create schedule proposals"
ON schedule_proposals FOR INSERT
WITH CHECK (
  auth.uid() = proposed_by
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_matches_updated_at();

-- Comments
COMMENT ON TABLE matches IS 'Tournament matches across all phases (round robin, semifinals, grand final)';
COMMENT ON TABLE match_games IS 'Individual games within a match (for Bo3, Bo5, etc.)';
COMMENT ON TABLE schedule_proposals IS 'Captain-proposed match scheduling times (Phase 2 feature)';
COMMENT ON COLUMN matches.phase IS 'Tournament phase: round_robin, semifinal, or grandfinal';
COMMENT ON COLUMN matches.best_of IS '1 for round robin (AP3), 3 for semifinals, 5 for grand final';
COMMENT ON COLUMN matches.status IS 'Match status: pending, scheduled, in_progress, completed, disputed';
