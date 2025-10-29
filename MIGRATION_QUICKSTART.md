# Quick Start - After Migration

## Step 1: Run Database Migration

```sql
-- In Supabase SQL Editor, paste and run:
-- File: database/draft_schema_v2.sql
```

This will:
- ✅ Drop old `captain_presence` table
- ✅ Create `draft_events` audit log
- ✅ Add auto-logging triggers
- ✅ Enable Realtime on tables

**Time**: ~10 seconds

## Step 2: Verify Migration

```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('draft_events', 'draft_sessions', 'draft_picks');

-- Verify captain_presence is gone
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'captain_presence';
-- Should return 0 rows

-- Check triggers
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%draft%';
```

## Step 3: Test Draft Flow

1. **Start a draft**:
   - Go to tournament → Categorize players
   - Rank captains → Start tournament
   - Go to draft room

2. **Test captain presence**:
   - Open draft room as captain
   - You should see yourself as online (green)
   - Close tab → Reopen as admin
   - You should show offline within 5 seconds

3. **Test picks**:
   - Admin starts draft
   - Captain makes pick
   - Check `draft_events` table:
   ```sql
   SELECT * FROM draft_events 
   WHERE draft_session_id = 'your-session-id'
   ORDER BY created_at DESC;
   ```

4. **Test realtime**:
   - Open draft room in 2 tabs
   - Make pick in tab 1
   - Should instantly appear in tab 2

## Troubleshooting

### Presence not updating
```javascript
// Check browser console for:
// "Tracking captain presence..."
// "Captain presence tracked"

// Check Supabase Realtime logs:
// Dashboard → Database → Realtime
```

### Events not logging
```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'log_draft_event';

-- Check if trigger is active
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgname = 'on_draft_pick_made';
```

### Realtime not working
```sql
-- Check if Realtime is enabled on tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

## Quick Commands

```sql
-- View all draft events
SELECT * FROM draft_events ORDER BY created_at DESC LIMIT 20;

-- Get draft timeline with names
SELECT * FROM get_draft_timeline('draft-session-id');

-- Current draft state
SELECT * FROM draft_current_state;

-- Check captain presence (should be empty - using Supabase Presence now)
SELECT * FROM captain_presence; -- Should error: table doesn't exist
```

## What Changed

| Old Way | New Way |
|---------|---------|
| `captain_presence` table | Supabase Presence API |
| Manual heartbeats every 3 sec | Automatic via WebSocket |
| Database polling | Realtime subscriptions |
| Custom timeout checking | Built-in disconnect detection |
| No audit log | `draft_events` table |

## Files Changed

- ✅ `database/draft_schema_v2.sql` - Migration SQL
- ✅ `client/src/services/draftService.js` - Removed old presence functions
- ✅ `client/src/pages/DraftRoom.jsx` - Using Presence API
- 📄 `database/DRAFT_SCHEMA_V2_CHANGES.md` - Detailed guide
- 📄 `REALTIME_MIGRATION_COMPLETE.md` - Full documentation

## Need Help?

1. Check `REALTIME_MIGRATION_COMPLETE.md` for full details
2. Check `database/DRAFT_SCHEMA_V2_CHANGES.md` for migration guide
3. Check browser console for errors
4. Check Supabase logs in dashboard
5. Query `draft_events` for audit trail
