-- =====================================================
-- Fix Realtime Publication - Remove captain_presence
-- =====================================================
-- This fixes the Realtime cache error by removing captain_presence from publication

-- Step 1: Check current publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Step 2: Remove captain_presence from realtime publication (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'captain_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE captain_presence;
    RAISE NOTICE '✅ Removed captain_presence from publication';
  ELSE
    RAISE NOTICE '✅ captain_presence was not in publication';
  END IF;
END $$;

-- Step 3: Verify it's removed
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'captain_presence'
    )
    THEN '❌ captain_presence still in publication'
    ELSE '✅ captain_presence removed from publication'
  END as publication_status;

-- Step 4: Ensure required tables ARE in the publication
DO $$
BEGIN
  -- Add draft_sessions if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'draft_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE draft_sessions;
    RAISE NOTICE '✅ Added draft_sessions to publication';
  ELSE
    RAISE NOTICE '✅ draft_sessions already in publication';
  END IF;

  -- Add draft_picks if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'draft_picks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE draft_picks;
    RAISE NOTICE '✅ Added draft_picks to publication';
  ELSE
    RAISE NOTICE '✅ draft_picks already in publication';
  END IF;

  -- Add draft_events if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'draft_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE draft_events;
    RAISE NOTICE '✅ Added draft_events to publication';
  ELSE
    RAISE NOTICE '✅ draft_events already in publication';
  END IF;
END $$;

-- Success message
SELECT '✅✅✅ Realtime publication fixed! captain_presence removed.' as final_status;
