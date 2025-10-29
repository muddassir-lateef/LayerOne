-- =====================================================
-- Re-enable user_id foreign key constraints
-- =====================================================
-- Run this after testing to restore database integrity

-- Re-add foreign key constraint on draft_picks
ALTER TABLE draft_picks 
  ADD CONSTRAINT draft_picks_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Re-add foreign key constraint on team_members
ALTER TABLE team_members 
  ADD CONSTRAINT team_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Re-add foreign key constraint on registrations
ALTER TABLE registrations 
  ADD CONSTRAINT registrations_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Verify constraints are added
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  '✅ Restored' as status
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE '%user_id_fkey%'
ORDER BY tc.table_name;

-- Success message
SELECT '✅ Foreign key constraints on user_id RESTORED. Database integrity enforced!' as status;
