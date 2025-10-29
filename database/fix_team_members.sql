-- ============================================
-- Fix Team Members Script
-- Ensures all team captains and drafted players are in team_members table
-- ============================================

DO $$
DECLARE
    v_tournament_id UUID := '183c142e-28c7-4541-8037-8dabc9a736f8'; -- Replace with your tournament ID
BEGIN
    -- Step 1: Ensure all captains are in team_members
    INSERT INTO team_members (team_id, user_id, is_captain, category_when_drafted, draft_round, draft_pick_number)
    SELECT 
        t.id as team_id,
        t.captain_id as user_id,
        true as is_captain,
        'S-Tier' as category_when_drafted,
        0 as draft_round,
        0 as draft_pick_number
    FROM teams t
    WHERE t.tournament_id = v_tournament_id
    AND NOT EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = t.id AND tm.user_id = t.captain_id
    );

    -- Step 2: Verify and report
    RAISE NOTICE 'Team members verification complete';
    
    -- Show all teams with member counts
    RAISE NOTICE 'Teams and their member counts:';
    FOR rec IN (
        SELECT 
            t.name,
            t.draft_order,
            COUNT(tm.user_id) as member_count,
            STRING_AGG(r.discord_username, ', ') as members
        FROM teams t
        LEFT JOIN team_members tm ON tm.team_id = t.id
        LEFT JOIN registrations r ON r.user_id = tm.user_id AND r.tournament_id = t.tournament_id
        WHERE t.tournament_id = v_tournament_id
        GROUP BY t.id, t.name, t.draft_order
        ORDER BY t.draft_order
    ) LOOP
        RAISE NOTICE 'Team %: % - % members: %', rec.draft_order, rec.name, rec.member_count, rec.members;
    END LOOP;

END $$;
