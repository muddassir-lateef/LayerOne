-- =====================================================
-- Check and Fix RLS Policies for Draft Tables
-- =====================================================

-- Check current policies on draft_sessions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'draft_sessions';

-- Check if RLS is enabled
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'draft_sessions';

-- Fix: Add proper RLS policies for draft_sessions
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view draft sessions" ON draft_sessions;
DROP POLICY IF EXISTS "Authenticated users can view draft sessions" ON draft_sessions;
DROP POLICY IF EXISTS "Tournament participants can view draft sessions" ON draft_sessions;
DROP POLICY IF EXISTS "Admin can manage draft sessions" ON draft_sessions;

-- Enable RLS
ALTER TABLE draft_sessions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can view draft sessions (for realtime)
CREATE POLICY "Anyone can view draft sessions"
  ON draft_sessions FOR SELECT
  USING (true);

-- Policy 2: Only authenticated users can insert draft sessions
CREATE POLICY "Authenticated users can create draft sessions"
  ON draft_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: Only authenticated users can update draft sessions
CREATE POLICY "Authenticated users can update draft sessions"
  ON draft_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify policies were created
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN roles = '{public}' THEN 'public'
    WHEN roles = '{authenticated}' THEN 'authenticated'
    ELSE roles::text
  END as allowed_roles
FROM pg_policies 
WHERE tablename = 'draft_sessions'
ORDER BY policyname;

-- Success message
SELECT '✅✅✅ RLS policies fixed for draft_sessions!' as status;
