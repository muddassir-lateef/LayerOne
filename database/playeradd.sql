-- ============================================
-- Demo Participants Script (Multiple Fake Players for Testing)
-- ============================================

-- ⚙️ Variables (edit only these!)
DO $$
DECLARE
    v_tournament_id UUID := '183c142e-28c7-4541-8037-8dabc9a736f8';
    v_admin_user_id UUID := '7618eadb-98c3-4bd4-934a-b64a7edb9298';
BEGIN
-- ⚠️ WARNING: This drops foreign key constraints to allow fake test data
-- Your existing real registration will remain intact.

-- Step 1: Drop foreign key constraints only (keep unique constraint)
EXECUTE 'ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_user_id_fkey';
EXECUTE 'ALTER TABLE player_categories DROP CONSTRAINT IF EXISTS player_categories_user_id_fkey';

-- Step 2: Insert 12 demo registrations with unique fake user IDs
INSERT INTO registrations (
  tournament_id, user_id, discord_username, discord_avatar_url,
  aoe2insights_url, preferred_position, preferred_civs_flank,
  preferred_civs_pocket, preferred_maps, notes, status, registered_at
) VALUES
-- S-Tier (3 players)
(v_tournament_id, '11111111-1111-1111-1111-111111111111', 'TheViper',
 'https://i.pravatar.cc/150?img=1', 'https://aoe2insights.com/user/1',
 'flank', '["Mayans", "Aztecs"]', '["Franks", "Teutons"]',
 '["Arabia", "Arena", "Hideout"]', 'S-Tier flank', 'approved', NOW() - INTERVAL '10 days'),

(v_tournament_id, '22222222-2222-2222-2222-222222222222', 'Hera',
 'https://i.pravatar.cc/150?img=2', 'https://aoe2insights.com/user/2',
 'pocket', '["Vikings", "Lithuanians"]', '["Khmer", "Burgundians"]',
 '["Arabia", "Golden Pit", "Atacama"]', 'S-Tier pocket', 'approved', NOW() - INTERVAL '9 days'),

(v_tournament_id, '33333333-3333-3333-3333-333333333333', 'Liereyy',
 'https://i.pravatar.cc/150?img=3', 'https://aoe2insights.com/user/3',
 'flank', '["Mongols", "Huns"]', '["Persians", "Berbers"]',
 '["Arabia", "Runestones", "Land Nomad"]', 'S-Tier cavalry', 'approved', NOW() - INTERVAL '8 days'),

-- A-Tier (3 players)
(v_tournament_id, '44444444-4444-4444-4444-444444444444', 'DauT',
 'https://i.pravatar.cc/150?img=4', 'https://aoe2insights.com/user/4',
 'pocket', '["Celts", "Britons"]', '["Slavs", "Goths"]',
 '["Arena", "Fortress", "Hideout"]', 'A-Tier pocket', 'approved', NOW() - INTERVAL '7 days'),

(v_tournament_id, '55555555-5555-5555-5555-555555555555', 'MbL',
 'https://i.pravatar.cc/150?img=5', 'https://aoe2insights.com/user/5',
 'flank', '["Ethiopians", "Portuguese"]', '["Turks", "Spanish"]',
 '["Arabia", "Golden Pit", "Socotra"]', 'A-Tier flank', 'approved', NOW() - INTERVAL '6 days'),

(v_tournament_id, '66666666-6666-6666-6666-666666666666', 'Vivi',
 'https://i.pravatar.cc/150?img=6', 'https://aoe2insights.com/user/6',
 'pocket', '["Japanese", "Koreans"]', '["Chinese", "Malians"]',
 '["Arabia", "Four Lakes", "Atacama"]', 'A-Tier pocket', 'approved', NOW() - INTERVAL '5 days'),

-- B-Tier (4 players)
(v_tournament_id, '77777777-7777-7777-7777-777777777777', 'T90Official',
 'https://i.pravatar.cc/150?img=7', 'https://aoe2insights.com/user/7',
 'flank', '["Saracens", "Byzantines"]', '["Italians", "Incas"]',
 '["Arabia", "Arena", "Black Forest"]', 'B-Tier flank', 'approved', NOW() - INTERVAL '4 days'),

(v_tournament_id, '88888888-8888-8888-8888-888888888888', 'Tatoh',
 'https://i.pravatar.cc/150?img=8', 'https://aoe2insights.com/user/8',
 'pocket', '["Sicilians", "Poles"]', '["Bohemians", "Armenians"]',
 '["Golden Pit", "Hideout", "Atacama"]', 'B-Tier pocket', 'approved', NOW() - INTERVAL '3 days'),

(v_tournament_id, '99999999-9999-9999-9999-999999999999', 'Nili',
 'https://i.pravatar.cc/150?img=9', 'https://aoe2insights.com/user/9',
 'flank', '["Gurjaras", "Hindustanis"]', '["Bengalis", "Dravidians"]',
 '["Arabia", "Socotra", "Runestones"]', 'B-Tier flank', 'approved', NOW() - INTERVAL '2 days'),

(v_tournament_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TheMax',
 'https://i.pravatar.cc/150?img=10', 'https://aoe2insights.com/user/10',
 'pocket', '["Vikings", "Magyars"]', '["Huns", "Mongols"]',
 '["Arabia", "Golden Pit", "Four Lakes"]', 'B-Tier pocket', 'approved', NOW() - INTERVAL '1 day'),

-- Misc (2 players)
(v_tournament_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Spirit_Of_The_Law',
 'https://i.pravatar.cc/150?img=11', 'https://aoe2insights.com/user/11',
 'flank', '["Koreans", "Vietnamese"]', '["Burmese", "Cumans"]',
 '["Arena", "Black Forest", "Fortress"]', 'Misc tier', 'approved', NOW() - INTERVAL '12 hours'),

(v_tournament_id, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Ornlu',
 'https://i.pravatar.cc/150?img=12', 'https://aoe2insights.com/user/12',
 'pocket', '["Sicilians", "Bulgarians"]', '["Tatars", "Lithuanians"]',
 '["Hideout", "Atacama", "Four Lakes"]', 'Misc tier', 'approved', NOW() - INTERVAL '6 hours');

-- Step 3: Assign categories to fake players
-- Assign S-Tier
INSERT INTO player_categories (tournament_id, user_id, category, assigned_by)
SELECT v_tournament_id, user_id, 'S-Tier', v_admin_user_id
FROM registrations
WHERE tournament_id = v_tournament_id
  AND discord_username IN ('TheViper', 'Hera', 'Liereyy');

-- Assign A-Tier
INSERT INTO player_categories (tournament_id, user_id, category, assigned_by)
SELECT v_tournament_id, user_id, 'A-Tier', v_admin_user_id
FROM registrations
WHERE tournament_id = v_tournament_id
  AND discord_username IN ('DauT', 'MbL', 'Vivi');

-- Assign B-Tier
INSERT INTO player_categories (tournament_id, user_id, category, assigned_by)
SELECT v_tournament_id, user_id, 'B-Tier', v_admin_user_id
FROM registrations
WHERE tournament_id = v_tournament_id
  AND discord_username IN ('T90Official', 'Tatoh', 'Nili', 'TheMax');

-- Assign Misc
INSERT INTO player_categories (tournament_id, user_id, category, assigned_by)
SELECT v_tournament_id, user_id, 'Misc', v_admin_user_id
FROM registrations
WHERE tournament_id = v_tournament_id
  AND discord_username IN ('Spirit_Of_The_Law', 'Ornlu');

-- Step 4: Verify
RAISE NOTICE 'Demo data inserted for tournament %', v_tournament_id;

END $$;
