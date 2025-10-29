# Draft System Schema V2 - Migration Guide

## Overview
Updated the draft system to use **Supabase Realtime** features properly, removing manual presence tracking in favor of Supabase's built-in Presence API.

## What Changed

### ✅ Removed
- **`captain_presence` table** - Replaced by Supabase Presence API
  - No more manual heartbeat tracking
  - No more `is_online`, `last_heartbeat` columns
  - Automatic disconnect detection by Supabase

### ✅ Added
- **`draft_events` table** - Audit log for all draft actions
  - Tracks: picks, status changes, captain connections, admin actions
  - Enables analytics, debugging, and event replay
  - Auto-populated via triggers

### ✅ Enhanced
- **Auto-logging triggers** - Automatically record events to `draft_events`
- **Helper functions** - `log_draft_event()`, `get_draft_timeline()`
- **Realtime publications** - Enabled on `draft_sessions`, `draft_picks`, `draft_events`
- **Current state view** - `draft_current_state` for dashboard queries

## Migration Steps

### 1. Run the Migration SQL
```bash
# In Supabase SQL Editor, run:
database/draft_schema_v2.sql
```

This will:
- ✅ Drop `captain_presence` table and related functions/triggers
- ✅ Create `draft_events` table with RLS policies
- ✅ Add auto-logging triggers
- ✅ Enable Realtime on necessary tables
- ✅ Create helper functions and views

### 2. No Data Loss
All important data is preserved:
- ✅ `draft_sessions` - All draft configuration
- ✅ `draft_picks` - All pick history
- ✅ `teams` - All team data
- ✅ `team_members` - All roster data

Only removed: `captain_presence` table (replaced by Supabase Presence)

### 3. Frontend Already Updated
The frontend code in `DraftRoom.jsx` has already been updated to use Supabase Presence, so no frontend changes needed after running the migration.

## What's Stored in Database vs Realtime

### Database Tables (Permanent Storage)
| Table | Purpose | Why in DB |
|-------|---------|-----------|
| `draft_sessions` | Draft configuration and final state | Permanent record, query draft history |
| `draft_picks` | All picks made during draft | Permanent record, team rosters, analytics |
| `draft_events` | Audit log of all draft actions | Analytics, debugging, event replay |
| `teams` | Team info with captain and draft order | Permanent, used across tournament |
| `team_members` | Final team rosters | Permanent, used for matches |

### Supabase Realtime (Live, Temporary)
| Feature | Purpose | Why Realtime |
|---------|---------|--------------|
| **Presence** | Captain online/offline status | Live tracking, auto-cleanup, no manual heartbeats |
| **Postgres Changes** | Live updates on picks/status | Real-time UI updates across all clients |
| **Broadcast** | Custom events (timer, pause) | Low-latency, ephemeral events |

## Benefits of V2

### 🚀 Performance
- No manual polling/checking for captain presence
- Automatic connection management
- WebSocket-based (faster than HTTP)

### 💾 Data Integrity
- Audit log of all draft events
- Event replay capability
- Better debugging with timeline

### 🛠️ Maintenance
- Less code (removed ~200 lines of heartbeat logic)
- Industry-standard approach
- Leverages Supabase's infrastructure

### 🐛 Bug Fixes
- Reliable disconnect detection (no more "ghost" online captains)
- No screen flashing (no manual polling)
- Instant updates across all clients

## New Features Enabled

### 1. Draft Timeline
```sql
SELECT * FROM get_draft_timeline('draft_session_id');
```
Returns chronological list of all events with actor names and metadata.

### 2. Event Logging
Events are automatically logged:
- Pick made → Logs player, team, pick number, time taken
- Status changed → Logs old/new status
- Category changed → Logs category progression

### 3. Current State View
```sql
SELECT * FROM draft_current_state WHERE tournament_id = 'xyz';
```
Quick overview of draft status, teams, and pick counts.

## Frontend Implementation

### Presence Tracking (Already Implemented)
```javascript
// Subscribe to presence
channel.on('presence', { event: 'sync' }, () => {
  const presenceState = channel.presenceState();
  // presenceState contains all online captains
});

// Track presence (captain joins)
channel.track({
  user_id: user.id,
  online_at: new Date().toISOString(),
  team: myTeam?.draft_order
});

// Cleanup (captain leaves)
channel.untrack();
```

### Broadcast for Custom Events (Optional Enhancement)
```javascript
// Send timer tick
channel.send({
  type: 'broadcast',
  event: 'timer_tick',
  payload: { seconds_remaining: 30 }
});

// Listen for timer
channel.on('broadcast', { event: 'timer_tick' }, (payload) => {
  console.log('Timer:', payload.seconds_remaining);
});
```

## Testing Checklist

After running migration:

- [ ] Captain presence indicators work (connect/disconnect)
- [ ] Picks are recorded in `draft_picks` table
- [ ] Events logged in `draft_events` table
- [ ] Timeline query returns correct events
- [ ] No screen flashing during draft
- [ ] Captains marked offline within 5 seconds of disconnect
- [ ] Draft state persists across page refreshes

## Rollback Plan

If issues occur, you can recreate `captain_presence` table by running the original `draft_schema.sql`. However, the new implementation is more reliable and should be used.

## Future Enhancements

With this foundation, you can now easily add:

1. **Pick Timer** - Broadcast timer ticks to all clients
2. **Draft Replay** - Use `draft_events` to replay entire draft
3. **Analytics Dashboard** - Query `draft_events` for insights
4. **Admin Controls** - Pause/resume with broadcast notifications
5. **Chat/Notifications** - Use Broadcast for draft room chat

## Support

If you encounter any issues:
1. Check Supabase Realtime logs in dashboard
2. Check `draft_events` table for event history
3. Verify Realtime is enabled on tables: `draft_sessions`, `draft_picks`, `draft_events`
