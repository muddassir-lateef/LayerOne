-- =====================================================
-- Verification Script - Check migration status
-- =====================================================
-- This script checks if you're on V2 schema or still on V1

-- Check 1: captain_presence table (should NOT exist in V2)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'captain_presence'
    ) 
    THEN '❌ V1 Schema - captain_presence table EXISTS. You need to run draft_schema_v2.sql'
    ELSE '✅ captain_presence table does not exist (good!)'
  END as captain_presence_status;

-- Check 2: draft_events table (should exist in V2)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'draft_events'
    ) 
    THEN '✅ V2 Schema - draft_events table EXISTS'
    ELSE '❌ draft_events table missing. You need to run draft_schema_v2.sql'
  END as draft_events_status;

-- Check 3: List all draft-related tables
SELECT 
  table_name,
  '✅ Exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('draft_sessions', 'draft_picks', 'draft_events', 'captain_presence')
ORDER BY table_name;

-- Check 4: Functions (V2 should have log_draft_event)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'log_draft_event'
    ) 
    THEN '✅ log_draft_event function exists (V2)'
    ELSE '❌ log_draft_event function missing (need V2)'
  END as v2_function_status;

-- Check 5: Old functions (should NOT exist in V2)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'check_all_captains_connected'
    ) 
    THEN '❌ Old V1 function still exists - cleanup needed'
    ELSE '✅ V1 functions removed (good!)'
  END as v1_function_status;

-- Final Summary
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'captain_presence')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'draft_events')
     AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'log_draft_event')
    THEN '✅✅✅ Migration Complete! You are on V2 schema.'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'captain_presence')
    THEN '❌ Still on V1. Run draft_schema_v2.sql to migrate.'
    ELSE '⚠️ Partial migration. Run draft_schema_v2.sql to complete.'
  END as overall_status;
