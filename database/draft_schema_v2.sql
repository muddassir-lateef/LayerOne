-- =====================================================
-- Draft System Schema V2 - Updated for Supabase Realtime
-- =====================================================
-- Changes from V1:
-- 1. Remove captain_presence table (replaced by Supabase Presence)
-- 2. Add draft_events table for audit log and replay
-- 3. Update triggers and functions
-- 4. Simplify realtime subscriptions
--
-- Run these statements in order to upgrade from V1
-- =====================================================

-- =====================================================
-- 1. DROP captain_presence table and related objects
-- =====================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_captain_presence_change ON captain_presence;

-- Drop functions that depend on captain_presence
DROP FUNCTION IF EXISTS update_all_captains_connected();
DROP FUNCTION IF EXISTS check_all_captains_connected(uuid);

-- Drop the table
DROP TABLE IF EXISTS captain_presence CASCADE;

COMMENT ON COLUMN draft_sessions.all_captains_connected IS 'DEPRECATED: Now managed by Supabase Realtime Presence';

-- =====================================================
-- 2. CREATE draft_events table for audit log
-- =====================================================

CREATE TABLE IF NOT EXISTS draft_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_session_id uuid NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'draft_started',
    'draft_paused',
    'draft_resumed',
    'draft_completed',
    'pick_made',
    'category_changed',
    'captain_connected',
    'captain_disconnected',
    'timer_started',
    'timer_expired',
    'admin_action'
  )),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_draft_events_session ON draft_events(draft_session_id);
CREATE INDEX IF NOT EXISTS idx_draft_events_type ON draft_events(event_type);
CREATE INDEX IF NOT EXISTS idx_draft_events_created ON draft_events(draft_session_id, created_at DESC);

-- RLS Policies
ALTER TABLE draft_events ENABLE ROW LEVEL SECURITY;

-- Anyone can view draft events
CREATE POLICY "Draft events are viewable by everyone"
  ON draft_events FOR SELECT
  USING (true);

-- Only tournament admin and captains can insert events
CREATE POLICY "Admin and captains can log events"
  ON draft_events FOR INSERT
  WITH CHECK (
    draft_session_id IN (
      SELECT ds.id FROM draft_sessions ds
      JOIN tournaments t ON t.id = ds.tournament_id
      WHERE t.admin_id = auth.uid()
    )
    OR
    actor_id = auth.uid()
  );

COMMENT ON TABLE draft_events IS 'Audit log of all draft events for analytics and replay';
COMMENT ON COLUMN draft_events.metadata IS 'Additional event data (e.g., pick details, timer value, etc.)';

-- =====================================================
-- 3. CREATE helper function to log draft events
-- =====================================================

CREATE OR REPLACE FUNCTION log_draft_event(
  p_draft_session_id uuid,
  p_event_type text,
  p_actor_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO draft_events (
    draft_session_id,
    event_type,
    actor_id,
    team_id,
    metadata
  ) VALUES (
    p_draft_session_id,
    p_event_type,
    p_actor_id,
    p_team_id,
    p_metadata
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_draft_event IS 'Helper function to insert draft events with metadata';

-- =====================================================
-- 4. CREATE trigger to auto-log pick events
-- =====================================================

CREATE OR REPLACE FUNCTION auto_log_draft_pick()
RETURNS trigger AS $$
BEGIN
  -- Log the pick event
  PERFORM log_draft_event(
    NEW.draft_session_id,
    'pick_made',
    (SELECT captain_id FROM teams WHERE id = NEW.team_id),
    NEW.team_id,
    jsonb_build_object(
      'user_id', NEW.user_id,
      'pick_number', NEW.pick_number,
      'round_number', NEW.round_number,
      'category', NEW.category,
      'time_taken_seconds', NEW.time_taken_seconds
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_draft_pick_made ON draft_picks;
CREATE TRIGGER on_draft_pick_made
  AFTER INSERT ON draft_picks
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_draft_pick();

-- =====================================================
-- 5. CREATE trigger to auto-log session status changes
-- =====================================================

CREATE OR REPLACE FUNCTION auto_log_session_change()
RETURNS trigger AS $$
BEGIN
  -- Only log if status changed
  IF (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM log_draft_event(
      NEW.id,
      CASE NEW.status
        WHEN 'in_progress' THEN 'draft_started'
        WHEN 'paused' THEN 'draft_paused'
        WHEN 'completed' THEN 'draft_completed'
        ELSE 'admin_action'
      END,
      (SELECT admin_id FROM tournaments WHERE id = NEW.tournament_id),
      NULL,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'current_category', NEW.current_category
      )
    );
  END IF;
  
  -- Log category changes
  IF (TG_OP = 'UPDATE' AND OLD.current_category IS DISTINCT FROM NEW.current_category) THEN
    PERFORM log_draft_event(
      NEW.id,
      'category_changed',
      (SELECT admin_id FROM tournaments WHERE id = NEW.tournament_id),
      NULL,
      jsonb_build_object(
        'old_category', OLD.current_category,
        'new_category', NEW.current_category
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_draft_session_change ON draft_sessions;
CREATE TRIGGER on_draft_session_change
  AFTER INSERT OR UPDATE ON draft_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_session_change();

-- =====================================================
-- 6. CREATE function to get draft timeline
-- =====================================================

CREATE OR REPLACE FUNCTION get_draft_timeline(p_draft_session_id uuid)
RETURNS TABLE (
  id uuid,
  event_type text,
  actor_username text,
  team_name text,
  metadata jsonb,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.event_type,
    COALESCE(r.discord_username, 'System') as actor_username,
    t.name as team_name,
    de.metadata,
    de.created_at
  FROM draft_events de
  LEFT JOIN tournaments tour ON tour.id = (
    SELECT tournament_id FROM draft_sessions WHERE id = de.draft_session_id
  )
  LEFT JOIN registrations r ON r.user_id = de.actor_id AND r.tournament_id = tour.id
  LEFT JOIN teams t ON t.id = de.team_id
  WHERE de.draft_session_id = p_draft_session_id
  ORDER BY de.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_draft_timeline IS 'Returns chronological timeline of draft events with user/team details';

-- =====================================================
-- 7. Enable Realtime for required tables
-- =====================================================

-- Enable realtime on draft_sessions for status updates (if not already added)
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'draft_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE draft_sessions;
  END IF;
END $$;

-- Enable realtime on draft_picks for pick notifications (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'draft_picks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE draft_picks;
  END IF;
END $$;

-- Enable realtime on draft_events for live event feed (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'draft_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE draft_events;
  END IF;
END $$;

-- =====================================================
-- 8. CREATE view for current draft state
-- =====================================================

CREATE OR REPLACE VIEW draft_current_state AS
SELECT 
  ds.id as draft_session_id,
  ds.tournament_id,
  t.name as tournament_name,
  ds.status,
  ds.current_category,
  ds.current_round,
  COUNT(dp.id) as total_picks,
  COUNT(DISTINCT dp.team_id) as teams_with_picks,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'team_id', tm.id,
        'team_name', tm.name,
        'captain_id', tm.captain_id,
        'draft_order', tm.draft_order,
        'picks_count', (
          SELECT COUNT(*) FROM draft_picks WHERE team_id = tm.id AND draft_session_id = ds.id
        )
      ) ORDER BY tm.draft_order
    )
    FROM teams tm
    WHERE tm.tournament_id = ds.tournament_id
  ) as teams,
  ds.started_at,
  ds.completed_at
FROM draft_sessions ds
JOIN tournaments t ON t.id = ds.tournament_id
LEFT JOIN draft_picks dp ON dp.draft_session_id = ds.id
GROUP BY ds.id, t.name;

-- Grant access to view
GRANT SELECT ON draft_current_state TO authenticated, anon;

COMMENT ON VIEW draft_current_state IS 'Current state of all draft sessions with team and pick counts';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Summary of changes:
-- ✅ Removed captain_presence table (replaced by Supabase Presence)
-- ✅ Added draft_events table for audit logging
-- ✅ Added auto-logging triggers for picks and status changes
-- ✅ Added helper functions for event logging and timeline
-- ✅ Enabled Realtime on necessary tables
-- ✅ Created view for current draft state
--
-- What's stored in database:
-- ✅ draft_sessions - Permanent record of draft configuration and state
-- ✅ draft_picks - Permanent record of all picks made
-- ✅ draft_events - Audit log of all draft actions (analytics, replay, debugging)
-- ✅ teams & team_members - Final team rosters
--
-- What's handled by Supabase Realtime:
-- ✅ Captain presence (online/offline) - Supabase Presence API
-- ✅ Live pick notifications - Postgres Changes on draft_picks
-- ✅ Draft status updates - Postgres Changes on draft_sessions
-- ✅ Custom events (timer, pause, etc.) - Broadcast API
