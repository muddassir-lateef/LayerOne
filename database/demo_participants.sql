-- Demo Participants Script (Multiple Fake Players for Testing)
-- Tournament ID: d6215dd2-1f9e-476b-9a18-c01f671e8010
-- User ID: 79c6030e-63fd-47f7-a0fb-4ddfc64660ef
--
-- ⚠️ WARNING: This drops foreign key constraints to allow fake test data
-- Creates 12 fake players with random UUIDs for testing
-- Your existing real registration will remain intact

-- Step 1: Drop foreign key constraints only (keep unique constraint)
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_user_id_fkey;
ALTER TABLE player_categories DROP CONSTRAINT IF EXISTS player_categories_user_id_fkey;

-- Step 2: Insert 12 demo registrations with unique fake user IDs
INSERT INTO registrations (
  tournament_id, user_id, discord_username, discord_avatar_url,
  aoe2insights_url, preferred_position, preferred_civs_flank,
  preferred_civs_pocket, preferred_maps, notes, status, registered_at
) VALUES
-- S-Tier (3 players)
('d6215dd2-1f9e-476b-9a18-c01f671e8010', '11111111-1111-1111-1111-111111111111', 'TheViper',
 'https://i.pravatar.cc/150?img=1', 'https://aoe2insights.com/user/1',
 'flank', '["Mayans", "Aztecs"]', '["Franks", "Teutons"]',
 '["Arabia", "Arena", "Hideout"]', 'S-Tier flank', 'approved', NOW() - INTERVAL '10 days'),

('d6215dd2-1f9e-476b-9a18-c01f671e8010', '22222222-2222-2222-2222-222222222222', 'Hera',
 'https://i.pravatar.cc/150?img=2', 'https://aoe2insights.com/user/2',
 'pocket', '["Vikings", "Lithuanians"]', '["Khmer", "Burgundians"]',
 '["Arabia", "Golden Pit", "Atacama"]', 'S-Tier pocket', 'approved', NOW() - INTERVAL '9 days'),

('d6215dd2-1f9e-476b-9a18-c01f671e8010', '33333333-3333-3333-3333-333333333333', 'Liereyy',
 'https://i.pravatar.cc/150?img=3', 'https://aoe2insights.com/user/3',
 'flank', '["Mongols", "Huns"]', '["Persians", "Berbers"]',
 '["Arabia", "Runestones", "Land Nomad"]', 'S-Tier cavalry', 'approved', NOW() - INTERVAL '8 days'),

-- A-Tier (3 players)
('d6215dd2-1f9e-476b-9a18-c01f671e8010', '44444444-4444-4444-4444-444444444444', 'DauT',
 'https://i.pravatar.cc/150?img=4', 'https://aoe2insights.com/user/4',
 'pocket', '["Celts", "Britons"]', '["Slavs", "Goths"]',
 '["Arena", "Fortress", "Hideout"]', 'A-Tier pocket', 'approved', NOW() - INTERVAL '7 days'),

('d6215dd2-1f9e-476b-9a18-c01f671e8010', '55555555-5555-5555-5555-555555555555', 'MbL',
 'https://i.pravatar.cc/150?img=5', 'https://aoe2insights.com/user/5',
 'flank', '["Ethiopians", "Portuguese"]', '["Turks", "Spanish"]',
 '["Arabia", "Golden Pit", "Socotra"]', 'A-Tier flank', 'approved', NOW() - INTERVAL '6 days'),

('d6215dd2-1f9e-476b-9a18-c01f671e8010', '66666666-6666-6666-6666-666666666666', 'Vivi',
 'https://i.pravatar.cc/150?img=6', 'https://aoe2insights.com/user/6',
 'pocket', '["Japanese", "Koreans"]', '["Chinese", "Malians"]',
 '["Arabia", "Four Lakes", "Atacama"]', 'A-Tier pocket', 'approved', NOW() - INTERVAL '5 days'),

-- B-Tier (4 players)
('d6215dd2-1f9e-476b-9a18-c01f671e8010', '77777777-7777-7777-7777-777777777777', 'T90Official',
 'https://i.pravatar.cc/150?img=7', 'https://aoe2insights.com/user/7',
 'flank', '["Saracens", "Byzantines"]', '["Italians", "Incas"]',
 '["Arabia", "Arena", "Black Forest"]', 'B-Tier flank', 'approved', NOW() - INTERVAL '4 days'),

('d6215dd2-1f9e-476b-9a18-c01f671e8010', '88888888-8888-8888-8888-888888888888', 'Tatoh',
 'https://i.pravatar.cc/150?img=8', 'https://aoe2insights.com/user/8',
 'pocket', '["Sicilians", "Poles"]', '["Bohemians", "Armenians"]',
 '["Golden Pit", "Hideout", "Atacama"]', 'B-Tier pocket', 'approved', NOW() - INTERVAL '3 days'),

('d6215dd2-1f9e-476b-9a18-c01f671e8010', '99999999-9999-9999-9999-999999999999', 'Nili',
 'https://i.pravatar.cc/150?img=9', 'https://aoe2insights.com/user/9',
 'flank', '["Gurjaras", "Hindustanis"]', '["Bengalis", "Dravidians"]',
 '["Arabia", "Socotra", "Runestones"]', 'B-Tier flank', 'approved', NOW() - INTERVAL '2 days'),

('d6215dd2-1f9e-476b-9a18-c01f671e8010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TheMax',
 'https://i.pravatar.cc/150?img=10', 'https://aoe2insights.com/user/10',
 'pocket', '["Vikings", "Magyars"]', '["Huns", "Mongols"]',
 '["Arabia", "Golden Pit", "Four Lakes"]', 'B-Tier pocket', 'approved', NOW() - INTERVAL '1 day'),

-- Misc (2 players)
('d6215dd2-1f9e-476b-9a18-c01f671e8010', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Spirit_Of_The_Law',
 'https://i.pravatar.cc/150?img=11', 'https://aoe2insights.com/user/11',
 'flank', '["Koreans", "Vietnamese"]', '["Burmese", "Cumans"]',
 '["Arena", "Black Forest", "Fortress"]', 'Misc tier', 'approved', NOW() - INTERVAL '12 hours'),

('d6215dd2-1f9e-476b-9a18-c01f671e8010', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Ornlu',
 'https://i.pravatar.cc/150?img=12', 'https://aoe2insights.com/user/12',
 'pocket', '["Sicilians", "Bulgarians"]', '["Tatars", "Lithuanians"]',
 '["Hideout", "Atacama", "Four Lakes"]', 'Misc tier', 'approved', NOW() - INTERVAL '6 hours');

-- Step 3: Assign categories to fake players
-- Assign S-Tier categories
INSERT INTO player_categories (tournament_id, user_id, category, assigned_by)
SELECT 
  'd6215dd2-1f9e-476b-9a18-c01f671e8010',
  user_id,
  'S-Tier',
  '79c6030e-63fd-47f7-a0fb-4ddfc64660ef'
FROM registrations
WHERE tournament_id = 'd6215dd2-1f9e-476b-9a18-c01f671e8010'
  AND discord_username IN ('TheViper', 'Hera', 'Liereyy');

-- Assign A-Tier categories
INSERT INTO player_categories (tournament_id, user_id, category, assigned_by)
SELECT 
  'd6215dd2-1f9e-476b-9a18-c01f671e8010',
  user_id,
  'A-Tier',
  '79c6030e-63fd-47f7-a0fb-4ddfc64660ef'
FROM registrations
WHERE tournament_id = 'd6215dd2-1f9e-476b-9a18-c01f671e8010'
  AND discord_username IN ('DauT', 'MbL', 'Vivi');

-- Assign B-Tier categories
INSERT INTO player_categories (tournament_id, user_id, category, assigned_by)
SELECT 
  'd6215dd2-1f9e-476b-9a18-c01f671e8010',
  user_id,
  'B-Tier',
  '79c6030e-63fd-47f7-a0fb-4ddfc64660ef'
FROM registrations
WHERE tournament_id = 'd6215dd2-1f9e-476b-9a18-c01f671e8010'
  AND discord_username IN ('T90Official', 'Tatoh', 'Nili', 'TheMax');

-- Assign Misc categories
INSERT INTO player_categories (tournament_id, user_id, category, assigned_by)
SELECT 
  'd6215dd2-1f9e-476b-9a18-c01f671e8010',
  user_id,
  'Misc',
  '79c6030e-63fd-47f7-a0fb-4ddfc64660ef'
FROM registrations
WHERE tournament_id = 'd6215dd2-1f9e-476b-9a18-c01f671e8010'
  AND discord_username IN ('Spirit_Of_The_Law', 'Ornlu');

-- Step 4: Verify results (unique constraint still active)
SELECT 
  r.discord_username,
  r.preferred_position,
  pc.category
FROM registrations r
LEFT JOIN player_categories pc ON pc.user_id = r.user_id AND pc.tournament_id = r.tournament_id
WHERE r.tournament_id = 'd6215dd2-1f9e-476b-9a18-c01f671e8010'
ORDER BY 
  CASE COALESCE(pc.category, 'Uncategorized')
    WHEN 'S-Tier' THEN 1
    WHEN 'A-Tier' THEN 2
    WHEN 'B-Tier' THEN 3
    WHEN 'Misc' THEN 4
    ELSE 5
  END;

-- ==============================================================
-- CLEANUP: Remove demo data and restore foreign key constraints
-- ==============================================================

/*
-- Option 1: Delete ONLY demo users for this tournament (keeps real users)
DELETE FROM player_categories 
WHERE tournament_id = 'd6215dd2-1f9e-476b-9a18-c01f671e8010'
  AND user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM registrations 
WHERE tournament_id = 'd6215dd2-1f9e-476b-9a18-c01f671e8010'
  AND user_id NOT IN (SELECT id FROM auth.users);

-- Option 2: Delete ALL fake data across entire database (if you added demo data to multiple tournaments)
DELETE FROM player_categories 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM registrations 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Restore foreign key constraints
ALTER TABLE registrations
ADD CONSTRAINT registrations_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE player_categories
ADD CONSTRAINT player_categories_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id);
*/
