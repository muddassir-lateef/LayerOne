-- =====================================================
-- TESTING ONLY: Remove user_id foreign key constraints
-- =====================================================
-- This allows you to insert fake players that don't exist in auth.users
-- ⚠️ USE ONLY FOR TESTING - Re-enable after testing!

-- Drop foreign key constraint on draft_picks
ALTER TABLE draft_picks 
  DROP CONSTRAINT IF EXISTS draft_picks_user_id_fkey;

-- Drop foreign key constraint on team_members
ALTER TABLE team_members 
  DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

-- Drop foreign key constraint on registrations (if needed)
ALTER TABLE registrations 
  DROP CONSTRAINT IF EXISTS registrations_user_id_fkey;

-- Verify constraints are removed
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE '%user_id_fkey%';

-- Success message
SELECT '⚠️ Foreign key constraints on user_id REMOVED. Remember to re-enable after testing!' as status;
