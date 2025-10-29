-- Draft System Schema
-- Supports live snake draft with real-time captain presence tracking
--
-- This schema includes:
-- 1. teams table - stores teams with captain and draft order
-- 2. team_members table - players on each team with draft metadata
-- 3. draft_sessions table - tracks live draft state
-- 4. draft_picks table - records all picks made during draft
-- 5. captain_presence table - real-time online/offline tracking
-- 6. Helper functions for captain presence and available players
-- 7. RLS policies for security
-- 8. Triggers for automatic updates
-- 9. Updated tournament status enum
--
-- Run this entire file in Supabase SQL Editor to set up the draft system.

-- =====================================================
-- 0. Create teams and team_members tables (prerequisites)
-- =====================================================

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  captain_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_order integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_captain ON teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_teams_draft_order ON teams(tournament_id, draft_order);

-- RLS Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Anyone can view teams
CREATE POLICY "Teams are viewable by everyone"
  ON teams FOR SELECT
  USING (true);

-- Tournament admin can manage teams
CREATE POLICY "Tournament admin can manage teams"
  ON teams FOR ALL
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE admin_id = auth.uid()
    )
  );

-- Captains can update their own team
CREATE POLICY "Captains can update their own team"
  ON teams FOR UPDATE
  USING (captain_id = auth.uid())
  WITH CHECK (captain_id = auth.uid());

COMMENT ON TABLE teams IS 'Teams in tournaments, created when admin ranks S-Tier captains';
COMMENT ON COLUMN teams.draft_order IS 'Snake pattern position (1, 2, 3, 4...), assigned by admin ranking of S-Tier captains';

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_captain boolean DEFAULT false,
  draft_round integer,
  draft_pick_number integer,
  category_when_drafted text CHECK (category_when_drafted IN ('S-Tier', 'A-Tier', 'B-Tier', 'Misc')),
  position_preference integer CHECK (position_preference IN (1, 2, 3)),
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(team_id, user_id)  -- Each player can only be on a team once
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_captain ON team_members(team_id, is_captain);

-- RLS Policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Anyone can view team members
CREATE POLICY "Team members are viewable by everyone"
  ON team_members FOR SELECT
  USING (true);

-- Tournament admin can manage team members
CREATE POLICY "Tournament admin can manage team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN tournaments tour ON tour.id = t.tournament_id
      WHERE tour.admin_id = auth.uid()
    )
  );

-- Captains can manage their own team members
CREATE POLICY "Captains can manage their team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid()
    )
  );

COMMENT ON TABLE team_members IS 'Players on each team, including draft metadata';
COMMENT ON COLUMN team_members.draft_round IS 'Which round within the category they were picked';
COMMENT ON COLUMN team_members.draft_pick_number IS 'Sequential pick number across entire draft';
COMMENT ON COLUMN team_members.category_when_drafted IS 'Category they were in when drafted';

-- =====================================================
-- 1. Draft Sessions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS draft_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting_for_captains' CHECK (status IN (
    'waiting_for_captains',  -- Captains need to connect
    'ready',                 -- All captains connected, admin can start
    'in_progress',           -- Draft is ongoing
    'paused',                -- Admin paused the draft
    'completed'              -- Draft finished
  )),
  current_category text CHECK (current_category IN ('A-Tier', 'B-Tier', 'Misc')),
  current_pick_team_id uuid REFERENCES teams(id),
  current_round integer DEFAULT 1,
  pick_timer_seconds integer DEFAULT 60,
  pick_deadline timestamp with time zone,
  all_captains_connected boolean DEFAULT false,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_draft_sessions_tournament ON draft_sessions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_draft_sessions_status ON draft_sessions(status);

-- RLS Policies
ALTER TABLE draft_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view draft sessions for public tournaments
CREATE POLICY "Draft sessions are viewable by everyone"
  ON draft_sessions FOR SELECT
  USING (true);

-- Only tournament admin can insert/update draft sessions
CREATE POLICY "Tournament admin can manage draft sessions"
  ON draft_sessions FOR ALL
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE admin_id = auth.uid()
    )
  );

COMMENT ON TABLE draft_sessions IS 'Tracks live draft state for tournament team formation';

-- =====================================================
-- 2. Draft Picks Table
-- =====================================================

CREATE TABLE IF NOT EXISTS draft_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_session_id uuid NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pick_number integer NOT NULL,
  round_number integer NOT NULL,
  category text NOT NULL CHECK (category IN ('A-Tier', 'B-Tier', 'Misc')),
  picked_at timestamp with time zone DEFAULT now(),
  time_taken_seconds integer,
  UNIQUE(draft_session_id, user_id),  -- Each player can only be picked once per draft
  UNIQUE(draft_session_id, pick_number)  -- Each pick number is unique
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_draft_picks_session ON draft_picks(draft_session_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_team ON draft_picks(team_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_user ON draft_picks(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_pick_number ON draft_picks(draft_session_id, pick_number);

-- RLS Policies
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;

-- Anyone can view draft picks
CREATE POLICY "Draft picks are viewable by everyone"
  ON draft_picks FOR SELECT
  USING (true);

-- Only tournament admin and captains can insert picks
CREATE POLICY "Captains and admin can make picks"
  ON draft_picks FOR INSERT
  WITH CHECK (
    -- Must be tournament admin
    draft_session_id IN (
      SELECT ds.id FROM draft_sessions ds
      JOIN tournaments t ON t.id = ds.tournament_id
      WHERE t.admin_id = auth.uid()
    )
    OR
    -- Or must be the captain whose turn it is
    team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid()
    )
  );

COMMENT ON TABLE draft_picks IS 'Records all player picks made during the draft';

-- =====================================================
-- 4. Captain Presence Table
-- =====================================================

CREATE TABLE IF NOT EXISTS captain_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_session_id uuid NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
  captain_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  is_online boolean DEFAULT false,
  last_heartbeat timestamp with time zone DEFAULT now(),
  connected_at timestamp with time zone DEFAULT now(),
  disconnected_at timestamp with time zone,
  UNIQUE(draft_session_id, captain_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_captain_presence_session ON captain_presence(draft_session_id);
CREATE INDEX IF NOT EXISTS idx_captain_presence_captain ON captain_presence(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_presence_online ON captain_presence(draft_session_id, is_online);
CREATE INDEX IF NOT EXISTS idx_captain_presence_heartbeat ON captain_presence(last_heartbeat);

-- RLS Policies
ALTER TABLE captain_presence ENABLE ROW LEVEL SECURITY;

-- Anyone can view captain presence
CREATE POLICY "Captain presence is viewable by everyone"
  ON captain_presence FOR SELECT
  USING (true);

-- Captains can update their own presence
CREATE POLICY "Captains can update their own presence"
  ON captain_presence FOR ALL
  USING (captain_id = auth.uid());

-- Tournament admin can manage all presence records
CREATE POLICY "Tournament admin can manage captain presence"
  ON captain_presence FOR ALL
  USING (
    draft_session_id IN (
      SELECT ds.id FROM draft_sessions ds
      JOIN tournaments t ON t.id = ds.tournament_id
      WHERE t.admin_id = auth.uid()
    )
  );

COMMENT ON TABLE captain_presence IS 'Tracks real-time online/offline status of captains during draft';

-- =====================================================
-- 3. Helper Functions
-- =====================================================

-- Function to check if all captains are connected
CREATE OR REPLACE FUNCTION check_all_captains_connected(p_draft_session_id uuid)
RETURNS boolean AS $$
DECLARE
  total_captains integer;
  online_captains integer;
BEGIN
  -- Count total captains for this draft
  SELECT COUNT(DISTINCT t.captain_id)
  INTO total_captains
  FROM teams t
  JOIN draft_sessions ds ON ds.tournament_id = t.tournament_id
  WHERE ds.id = p_draft_session_id;
  
  -- Count online captains
  SELECT COUNT(*)
  INTO online_captains
  FROM captain_presence
  WHERE draft_session_id = p_draft_session_id
    AND is_online = true
    AND last_heartbeat > now() - interval '30 seconds';
  
  RETURN total_captains > 0 AND total_captains = online_captains;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update all_captains_connected flag
CREATE OR REPLACE FUNCTION update_all_captains_connected()
RETURNS trigger AS $$
BEGIN
  UPDATE draft_sessions
  SET all_captains_connected = check_all_captains_connected(NEW.draft_session_id),
      updated_at = now()
  WHERE id = NEW.draft_session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update all_captains_connected when presence changes
DROP TRIGGER IF EXISTS on_captain_presence_change ON captain_presence;
CREATE TRIGGER on_captain_presence_change
  AFTER INSERT OR UPDATE ON captain_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_all_captains_connected();

-- Function to get available players for draft
CREATE OR REPLACE FUNCTION get_available_draft_players(
  p_tournament_id uuid,
  p_category text
)
RETURNS TABLE (
  user_id uuid,
  discord_username text,
  discord_avatar_url text,
  preferred_position text,
  preferred_civs_flank jsonb,
  preferred_civs_pocket jsonb,
  preferred_maps jsonb,
  notes text,
  category text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    r.discord_username,
    r.discord_avatar_url,
    r.preferred_position,
    r.preferred_civs_flank,
    r.preferred_civs_pocket,
    r.preferred_maps,
    r.notes,
    pc.category
  FROM registrations r
  JOIN player_categories pc ON pc.user_id = r.user_id 
    AND pc.tournament_id = r.tournament_id
  WHERE r.tournament_id = p_tournament_id
    AND r.status = 'approved'
    AND pc.category = p_category
    -- Not already a captain
    AND r.user_id NOT IN (
      SELECT captain_id FROM teams WHERE tournament_id = p_tournament_id
    )
    -- Not already drafted
    AND r.user_id NOT IN (
      SELECT dp.user_id
      FROM draft_picks dp
      JOIN draft_sessions ds ON ds.id = dp.draft_session_id
      WHERE ds.tournament_id = p_tournament_id
    )
  ORDER BY r.registered_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_available_draft_players IS 'Returns list of players available to draft in a specific category';

-- =====================================================
-- 4. Update tournament status enum
-- =====================================================

-- Note: This requires recreating the check constraint
-- First, remove old constraint if it exists
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_status_check;

-- Add new constraint with additional statuses
ALTER TABLE tournaments
ADD CONSTRAINT tournaments_status_check
CHECK (status IN (
  'draft',
  'registration_open',
  'registration_closed',
  'categorizing',
  'awaiting_captain_ranking',
  'draft_ready',
  'draft_in_progress',
  'teams_finalized',
  'in_progress',
  'completed'
));

-- =====================================================
-- 5. Updated timestamp triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_draft_sessions_updated_at ON draft_sessions;
CREATE TRIGGER update_draft_sessions_updated_at
  BEFORE UPDATE ON draft_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
