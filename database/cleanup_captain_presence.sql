-- =====================================================
-- Cleanup Script - Remove all captain_presence references
-- =====================================================
-- This script ensures all references to captain_presence are removed
-- Run this if you're still seeing errors about captain_presence

-- Drop all policies on captain_presence (if table exists)
DROP POLICY IF EXISTS "Captain presence is viewable by everyone" ON captain_presence;
DROP POLICY IF EXISTS "Captains can update their own presence" ON captain_presence;
DROP POLICY IF EXISTS "Tournament admin can manage captain presence" ON captain_presence;

-- Drop all triggers related to captain_presence
DROP TRIGGER IF EXISTS on_captain_presence_change ON captain_presence;

-- Drop all functions that reference captain_presence
DROP FUNCTION IF EXISTS update_all_captains_connected() CASCADE;
DROP FUNCTION IF EXISTS check_all_captains_connected(uuid) CASCADE;

-- Drop all indexes on captain_presence
DROP INDEX IF EXISTS idx_captain_presence_session;
DROP INDEX IF EXISTS idx_captain_presence_captain;
DROP INDEX IF EXISTS idx_captain_presence_online;
DROP INDEX IF EXISTS idx_captain_presence_heartbeat;

-- Finally, drop the table itself
DROP TABLE IF EXISTS captain_presence CASCADE;

-- Also check for any materialized views or other objects
DROP MATERIALIZED VIEW IF EXISTS captain_presence_summary CASCADE;

-- Verify removal
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'captain_presence'
  ) THEN
    RAISE EXCEPTION 'captain_presence table still exists!';
  ELSE
    RAISE NOTICE '✅ captain_presence table successfully removed';
  END IF;
END $$;

-- Remove the column from draft_sessions if it references captain_presence
-- (The all_captains_connected column is deprecated but we'll keep it for now)
COMMENT ON COLUMN draft_sessions.all_captains_connected IS 'DEPRECATED: Now managed by Supabase Realtime Presence. Will be removed in future version.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Cleanup complete! captain_presence table and all references removed.';
  RAISE NOTICE '✅ You can now use the draft system with Supabase Realtime Presence';
END $$;
