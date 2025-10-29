-- =====================================================
-- MATCHES SCHEMA V2 - COMPREHENSIVE MATCH TRACKING
-- =====================================================
-- This schema supports detailed tracking of:
-- - Match structure (Bo1, Bo3, Bo5, etc.)
-- - Individual games within matches
-- - Map drafts/selections for each game
-- - Civilization drafts/picks for each game
-- - Player participation in each game (positions, civs)
-- - Extensible for various match formats (1v1, 2v2, 3v3, 4v4+)
-- - Extensible metadata storage for future features
-- =====================================================

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS schedule_proposals CASCADE;
DROP TABLE IF EXISTS game_player_details CASCADE;
DROP TABLE IF EXISTS civ_draft_picks CASCADE;
DROP TABLE IF EXISTS civ_drafts CASCADE;
DROP TABLE IF EXISTS map_draft_picks CASCADE;
DROP TABLE IF EXISTS map_drafts CASCADE;
DROP TABLE IF EXISTS match_games CASCADE;
DROP TABLE IF EXISTS matches CASCADE;

-- =====================================================
-- MATCHES TABLE
-- Stores match-level information in tournament bracket
-- =====================================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  
  -- Match Classification
  phase TEXT NOT NULL CHECK (phase IN ('round_robin', 'semifinal', 'grandfinal')),
  round INTEGER, -- Round number within phase (for round robin)
  match_number INTEGER NOT NULL, -- Sequential match number
  
  -- Teams
  team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Match Configuration
  best_of INTEGER NOT NULL DEFAULT 1, -- Bo1, Bo3, Bo5, etc.
  match_format TEXT DEFAULT '3v3', -- '1v1', '2v2', '3v3', '4v4', 'custom', etc.
  
  -- Match Status & Results
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'disputed', 'cancelled')),
  scheduled_time TIMESTAMP WITH TIME ZONE,
  
  -- Overall Match Results (set wins)
  team1_score INTEGER DEFAULT 0, -- Games/sets won by team1
  team2_score INTEGER DEFAULT 0, -- Games/sets won by team2
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Additional Match Metadata (extensible JSON for future features)
  metadata JSONB DEFAULT '{}', 
  -- Example metadata:
  -- {"stream_url": "...", "vod_url": "...", "caster": "...", "spectator_delay": 5}
  
  -- Admin notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MATCH_GAMES TABLE
-- Stores individual games/sets within a match
-- Each game has its own map and civ draft process
-- =====================================================
CREATE TABLE match_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  
  -- Game Information
  game_number INTEGER NOT NULL, -- Game 1, 2, 3, etc. within the match
  
  -- Game Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'draft_phase', 'in_progress', 'completed', 'cancelled')),
  
  -- Game Results
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Selected Map (final map after draft/selection)
  selected_map_id UUID REFERENCES maps(id) ON DELETE SET NULL,
  
  -- Game Metadata (extensible JSON)
  metadata JSONB DEFAULT '{}',
  -- Example metadata:
  -- {"replay_file": "...", "game_duration": 2400, "game_type": "conquest", "starting_age": "feudal"}
  
  notes TEXT,
  played_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure game numbers are unique per match
  UNIQUE(match_id, game_number)
);

-- =====================================================
-- MAP_DRAFTS TABLE
-- Stores map draft/selection process for each game
-- Supports various draft formats
-- =====================================================
CREATE TABLE map_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES match_games(id) ON DELETE CASCADE,
  
  -- Draft Configuration
  draft_format TEXT DEFAULT 'preset', 
  -- Supported formats:
  -- 'preset' - Pre-determined map
  -- 'random' - Random selection from pool
  -- 'pick_ban' - Teams alternate picking/banning
  -- 'captain_pick' - Captains choose
  -- 'home_away' - Home team picks, away team bans, etc.
  
  -- Draft Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  
  -- Final Selection
  selected_map_id UUID REFERENCES maps(id) ON DELETE SET NULL,
  
  -- Draft Metadata (extensible JSON)
  metadata JSONB DEFAULT '{}',
  -- Example metadata:
  -- {"available_maps": [...], "map_pool_id": "...", "pick_order": [...]}
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- MAP_DRAFT_PICKS TABLE
-- Individual picks/bans during map draft process
-- =====================================================
CREATE TABLE map_draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_draft_id UUID NOT NULL REFERENCES map_drafts(id) ON DELETE CASCADE,
  
  -- Pick Details
  pick_order INTEGER NOT NULL, -- Sequence of this pick in the draft
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('pick', 'ban', 'random')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique pick order per draft
  UNIQUE(map_draft_id, pick_order)
);

-- =====================================================
-- CIV_DRAFTS TABLE
-- Stores civilization draft process for each game
-- =====================================================
CREATE TABLE civ_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES match_games(id) ON DELETE CASCADE,
  
  -- Draft Configuration
  draft_format TEXT DEFAULT 'open', 
  -- Supported formats:
  -- 'open' - Players can pick any civ
  -- 'pick_ban' - Teams alternate picking/banning civs
  -- 'captain_assigns' - Captain assigns civs to players
  -- 'mirrored' - Both teams must use same civs
  -- 'unique' - Each player must use different civ
  -- 'global_bans' - Some civs banned for entire tournament
  
  -- Draft Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  
  -- Draft Metadata (extensible JSON)
  metadata JSONB DEFAULT '{}',
  -- Example metadata:
  -- {"global_bans": [...], "available_civs": [...], "bans_per_team": 3, "picks_per_team": 3}
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- CIV_DRAFT_PICKS TABLE
-- Individual civ picks/bans during draft process
-- Team-level picks/bans (before player assignments)
-- =====================================================
CREATE TABLE civ_draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  civ_draft_id UUID NOT NULL REFERENCES civ_drafts(id) ON DELETE CASCADE,
  
  -- Pick Details
  pick_order INTEGER NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  civilization_id UUID NOT NULL REFERENCES civilizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('pick', 'ban', 'global_ban')),
  
  -- Optional: Which player this pick is for (if known during draft)
  player_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique pick order per draft
  UNIQUE(civ_draft_id, pick_order)
);

-- =====================================================
-- GAME_PLAYER_DETAILS TABLE
-- Stores which players participated in each game
-- Includes position and civilization for each player
-- Supports variable team sizes (1v1, 2v2, 3v3, 4v4+)
-- =====================================================
CREATE TABLE game_player_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES match_games(id) ON DELETE CASCADE,
  
  -- Player Information
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Position in Game
  position INTEGER NOT NULL, -- 1, 2, 3 (for 3v3) or 1, 2 (for 2v2), etc.
  position_type TEXT, -- 'flank', 'pocket', or NULL for flexibility
  
  -- Civilization Played
  civilization_id UUID REFERENCES civilizations(id) ON DELETE SET NULL,
  
  -- Player Performance Metadata (extensible JSON)
  metadata JSONB DEFAULT '{}',
  -- Example metadata:
  -- {"score": 15000, "military": 8000, "economy": 7000, "kills": 45, "deaths": 12, "mvp": true}
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique player per game
  UNIQUE(game_id, player_id)
);

-- =====================================================
-- SCHEDULE_PROPOSALS TABLE
-- Captain-driven match scheduling (Phase 2 feature)
-- =====================================================
CREATE TABLE schedule_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  
  -- Proposal Details
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Proposal Status
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'countered', 'expired')),
  
  -- Response Details
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  response_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- Performance optimization for common queries
-- =====================================================

-- Matches
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_phase ON matches(phase);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_team1 ON matches(team1_id);
CREATE INDEX idx_matches_team2 ON matches(team2_id);
CREATE INDEX idx_matches_scheduled_time ON matches(scheduled_time);

-- Match Games
CREATE INDEX idx_match_games_match ON match_games(match_id);
CREATE INDEX idx_match_games_status ON match_games(status);
CREATE INDEX idx_match_games_map ON match_games(selected_map_id);

-- Map Drafts
CREATE INDEX idx_map_drafts_game ON map_drafts(game_id);
CREATE INDEX idx_map_drafts_status ON map_drafts(status);
CREATE INDEX idx_map_draft_picks_draft ON map_draft_picks(map_draft_id);
CREATE INDEX idx_map_draft_picks_team ON map_draft_picks(team_id);
CREATE INDEX idx_map_draft_picks_map ON map_draft_picks(map_id);

-- Civ Drafts
CREATE INDEX idx_civ_drafts_game ON civ_drafts(game_id);
CREATE INDEX idx_civ_drafts_status ON civ_drafts(status);
CREATE INDEX idx_civ_draft_picks_draft ON civ_draft_picks(civ_draft_id);
CREATE INDEX idx_civ_draft_picks_team ON civ_draft_picks(team_id);
CREATE INDEX idx_civ_draft_picks_civ ON civ_draft_picks(civilization_id);

-- Game Player Details
CREATE INDEX idx_game_player_details_game ON game_player_details(game_id);
CREATE INDEX idx_game_player_details_player ON game_player_details(player_id);
CREATE INDEX idx_game_player_details_team ON game_player_details(team_id);
CREATE INDEX idx_game_player_details_civ ON game_player_details(civilization_id);

-- Schedule Proposals
CREATE INDEX idx_schedule_proposals_match ON schedule_proposals(match_id);
CREATE INDEX idx_schedule_proposals_proposer ON schedule_proposals(proposed_by);
CREATE INDEX idx_schedule_proposals_status ON schedule_proposals(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE civ_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE civ_draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_player_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_proposals ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MATCHES POLICIES
-- =====================================================
CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT
  USING (true);

CREATE POLICY "Tournament admin can manage matches"
  ON matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = matches.tournament_id
      AND tournaments.admin_id = auth.uid()
    )
  );

CREATE POLICY "Team captains can update match schedule"
  ON matches FOR UPDATE
  USING (
    -- Allow if user is captain of either team in the match
    EXISTS (
      SELECT 1 FROM teams
      WHERE (teams.id = matches.team1_id OR teams.id = matches.team2_id)
      AND teams.captain_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Allow if user is captain of either team in the match
    EXISTS (
      SELECT 1 FROM teams
      WHERE (teams.id = matches.team1_id OR teams.id = matches.team2_id)
      AND teams.captain_id = auth.uid()
    )
  );

-- =====================================================
-- MATCH GAMES POLICIES
-- =====================================================
CREATE POLICY "Anyone can view match games"
  ON match_games FOR SELECT
  USING (true);

CREATE POLICY "Tournament admin can manage match games"
  ON match_games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = match_games.match_id
      AND tournaments.admin_id = auth.uid()
    )
  );

-- =====================================================
-- MAP DRAFTS POLICIES
-- =====================================================
CREATE POLICY "Anyone can view map drafts"
  ON map_drafts FOR SELECT
  USING (true);

CREATE POLICY "Tournament admin can manage map drafts"
  ON map_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM match_games
      JOIN matches ON matches.id = match_games.match_id
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE match_games.id = map_drafts.game_id
      AND tournaments.admin_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view map draft picks"
  ON map_draft_picks FOR SELECT
  USING (true);

CREATE POLICY "Tournament admin and captains can manage map draft picks"
  ON map_draft_picks FOR ALL
  USING (
    -- Tournament admin
    EXISTS (
      SELECT 1 FROM map_drafts
      JOIN match_games ON match_games.id = map_drafts.game_id
      JOIN matches ON matches.id = match_games.match_id
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE map_drafts.id = map_draft_picks.map_draft_id
      AND tournaments.admin_id = auth.uid()
    )
    OR
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = map_draft_picks.team_id
      AND teams.captain_id = auth.uid()
    )
  );

-- =====================================================
-- CIV DRAFTS POLICIES
-- =====================================================
CREATE POLICY "Anyone can view civ drafts"
  ON civ_drafts FOR SELECT
  USING (true);

CREATE POLICY "Tournament admin can manage civ drafts"
  ON civ_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM match_games
      JOIN matches ON matches.id = match_games.match_id
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE match_games.id = civ_drafts.game_id
      AND tournaments.admin_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view civ draft picks"
  ON civ_draft_picks FOR SELECT
  USING (true);

CREATE POLICY "Tournament admin and captains can manage civ draft picks"
  ON civ_draft_picks FOR ALL
  USING (
    -- Tournament admin
    EXISTS (
      SELECT 1 FROM civ_drafts
      JOIN match_games ON match_games.id = civ_drafts.game_id
      JOIN matches ON matches.id = match_games.match_id
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE civ_drafts.id = civ_draft_picks.civ_draft_id
      AND tournaments.admin_id = auth.uid()
    )
    OR
    -- Team captain
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = civ_draft_picks.team_id
      AND teams.captain_id = auth.uid()
    )
  );

-- =====================================================
-- GAME PLAYER DETAILS POLICIES
-- =====================================================
CREATE POLICY "Anyone can view game player details"
  ON game_player_details FOR SELECT
  USING (true);

CREATE POLICY "Tournament admin can manage game player details"
  ON game_player_details FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM match_games
      JOIN matches ON matches.id = match_games.match_id
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE match_games.id = game_player_details.game_id
      AND tournaments.admin_id = auth.uid()
    )
  );

-- =====================================================
-- SCHEDULE PROPOSALS POLICIES
-- =====================================================
CREATE POLICY "Anyone can view schedule proposals"
  ON schedule_proposals FOR SELECT
  USING (true);

CREATE POLICY "Team captains can create proposals"
  ON schedule_proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      JOIN teams ON teams.id IN (matches.team1_id, matches.team2_id)
      WHERE matches.id = schedule_proposals.match_id
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Captains and admin can update proposals"
  ON schedule_proposals FOR UPDATE
  USING (
    -- Captain of either team
    EXISTS (
      SELECT 1 FROM matches
      JOIN teams ON teams.id IN (matches.team1_id, matches.team2_id)
      WHERE matches.id = schedule_proposals.match_id
      AND teams.captain_id = auth.uid()
    )
    OR
    -- Tournament admin
    EXISTS (
      SELECT 1 FROM matches
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = schedule_proposals.match_id
      AND tournaments.admin_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- Auto-update timestamps
-- =====================================================

-- Matches updated_at
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

-- Match Games updated_at
CREATE OR REPLACE FUNCTION update_match_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_games_updated_at
  BEFORE UPDATE ON match_games
  FOR EACH ROW
  EXECUTE FUNCTION update_match_games_updated_at();

-- Schedule Proposals updated_at
CREATE OR REPLACE FUNCTION update_schedule_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_proposals_updated_at
  BEFORE UPDATE ON schedule_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_proposals_updated_at();

-- =====================================================
-- COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE matches IS 'Tournament matches across all phases with extensible metadata';
COMMENT ON TABLE match_games IS 'Individual games within a match with map/civ draft tracking';
COMMENT ON TABLE map_drafts IS 'Map selection/draft process for each game';
COMMENT ON TABLE map_draft_picks IS 'Individual map picks/bans during draft';
COMMENT ON TABLE civ_drafts IS 'Civilization draft process for each game';
COMMENT ON TABLE civ_draft_picks IS 'Individual civ picks/bans during draft';
COMMENT ON TABLE game_player_details IS 'Player participation details for each game (positions, civs, stats)';
COMMENT ON TABLE schedule_proposals IS 'Captain-proposed match scheduling (Phase 2)';

COMMENT ON COLUMN matches.match_format IS 'Match format: 1v1, 2v2, 3v3, 4v4, or custom';
COMMENT ON COLUMN matches.metadata IS 'Extensible JSON for streams, VODs, casters, etc.';
COMMENT ON COLUMN match_games.metadata IS 'Extensible JSON for replay files, duration, game settings';
COMMENT ON COLUMN map_drafts.draft_format IS 'Draft format: preset, random, pick_ban, captain_pick, home_away';
COMMENT ON COLUMN civ_drafts.draft_format IS 'Draft format: open, pick_ban, captain_assigns, mirrored, unique, global_bans';
COMMENT ON COLUMN game_player_details.metadata IS 'Extensible JSON for player stats, score, achievements';
