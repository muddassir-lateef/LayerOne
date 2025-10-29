# Player Categorization Setup Guide

This guide explains how to set up and use the player categorization feature for tournaments.

## Overview

The player categorization feature allows tournament admins to assign skill tiers to registered players. This is a crucial step before team formation via captain draft.

**Skill Tiers:**
- **S-Tier**: Elite/Top tier players
- **A-Tier**: Advanced players
- **B-Tier**: Intermediate players
- **Misc**: Other/Miscellaneous tier players

## Database Setup

### 1. Execute the Schema SQL

Run the schema file in your Supabase SQL editor:

```bash
# File: database/player_categories_schema.sql
```

This creates:
- `player_categories` table
- Row Level Security policies
- Helper functions:
  - `get_uncategorized_players()` - Returns players without categories
  - `get_categorized_players()` - Returns players grouped by tier

### 2. Verify the Setup

Check that the table was created:

```sql
SELECT * FROM player_categories LIMIT 1;
```

Check the functions:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%categorized_players%';
```

## Features

### Admin View

**Access**: `/tournaments/:id/categories`

**Only tournament admins can:**
- View all registered players
- Assign players to skill tiers
- Move players between tiers
- Remove tier assignments
- See categorization statistics

### Statistics Dashboard

The page displays:
- Total categorized players
- Count per tier (S-Tier, A-Tier, B-Tier, Misc)
- Number of uncategorized players

### Player Categorization

**Uncategorized Players Section:**
- Shows all registered players without assigned tiers
- Displays player info with hover card (position, civs, maps)
- Quick-assign buttons for each tier
- Sorted by registration date

**Categorized Players Section:**
- Groups players by tier
- Color-coded tier headers
- Remove button to uncategorize
- Shows player preferences on hover

### PlayerCard Integration

The categorization page uses the `PlayerCard` component to display player details on hover:
- Discord avatar and username
- AoE2Insights profile link
- Preferred position (Flank/Pocket)
- Preferred civilizations for both positions
- Preferred maps
- Additional notes

## User Flow

### 1. Navigate to Categorization

From the tournament detail page, admins will see a **"Categorize Players"** button when:
- Tournament status is `registration_open`, OR
- Tournament status is `registration_closed`

### 2. Review Players

- Hover over any player to see their complete preferences
- Click the AoE2Insights link to view detailed stats
- Review position preference and civilization choices

### 3. Assign Categories

- Click one of the tier buttons (S-Tier, A-Tier, B-Tier, Misc)
- Player immediately moves to the appropriate tier section
- Categorization is saved to the database

### 4. Adjust if Needed

- Click the ✕ button on any categorized player to remove their tier
- They'll move back to the uncategorized section
- Reassign to a different tier if needed

### 5. Monitor Progress

- Statistics at the top show categorization progress
- Ensure all players are categorized before proceeding to draft

## API Functions

### Service: `playerCategoryService.js`

**Available functions:**

```javascript
// Assign or update a player's category
await assignPlayerCategory(tournamentId, userId, 'S-Tier');

// Remove a player's category
await removePlayerCategory(tournamentId, userId);

// Get all uncategorized players
const { data } = await getUncategorizedPlayers(tournamentId);

// Get all categorized players grouped by tier
const { data } = await getCategorizedPlayers(tournamentId);

// Get a specific player's category
const { data } = await getPlayerCategory(tournamentId, userId);

// Get category statistics
const { data: stats } = await getCategoryStats(tournamentId);
```

## Database Schema

```sql
player_categories (
  id: UUID PRIMARY KEY
  tournament_id: UUID -> tournaments(id)
  user_id: UUID -> auth.users(id)
  category: TEXT ('S-Tier', 'A-Tier', 'B-Tier', 'Misc')
  assigned_at: TIMESTAMP
  assigned_by: UUID -> auth.users(id)
  
  UNIQUE(tournament_id, user_id)
)
```

## Row Level Security

**Policies:**
- ✅ Everyone can view player categories
- ✅ Only tournament admin can assign/update/delete categories
- ✅ Prevents duplicate categories per player per tournament

## Workflow Integration

**Tournament Status Flow:**

1. **draft** → Create tournament
2. **registration_open** → Publish for registration
3. **registration_closed** → Close registration → **Categorize Players**
4. **in_progress** → Select captains → Conduct draft → Start matches
5. **completed** → Tournament ends

**Next Steps After Categorization:**
- Captain Selection (coming next)
- Snake Draft by Category
- Team Formation

## Styling

The categorization page uses color-coded tiers:
- **S-Tier**: Red (#ef4444)
- **A-Tier**: Orange (#f59e0b)
- **B-Tier**: Blue (#3b82f6)
- **Misc**: Gray (#6b7280)

## Troubleshooting

### Players not appearing in uncategorized list

**Check:**
1. Are they registered? (`registrations` table)
2. Is their status `approved`?
3. Do they already have a category assigned?

**SQL to verify:**

```sql
SELECT 
  r.discord_username,
  r.status,
  pc.category
FROM registrations r
LEFT JOIN player_categories pc ON pc.user_id = r.user_id 
  AND pc.tournament_id = r.tournament_id
WHERE r.tournament_id = 'YOUR_TOURNAMENT_ID';
```

### "Permission denied" error

**Check:**
1. Are you the tournament admin?
2. RLS policies enabled on `player_categories` table?

**SQL to verify admin:**

```sql
SELECT admin_id FROM tournaments WHERE id = 'YOUR_TOURNAMENT_ID';
```

### Categories not saving

**Check:**
1. Database connection working?
2. Check browser console for errors
3. Verify RLS policies allow insert

**Test manually:**

```sql
INSERT INTO player_categories (tournament_id, user_id, category, assigned_by)
VALUES ('tournament_id', 'user_id', 'S-Tier', 'admin_id');
```

## Future Enhancements

**Planned features:**
- [ ] Bulk categorization
- [ ] Import categories from CSV
- [ ] Category templates (preset tier distributions)
- [ ] Automatic categorization suggestions based on ELO
- [ ] Drag-and-drop tier assignment
- [ ] Category change history/audit log
- [ ] Custom tier names

## Technical Notes

**Database Functions:**
- Functions use `SECURITY DEFINER` to bypass RLS for read operations
- Ensures consistent access to registration data
- Admins can still only modify their own tournaments via policies

**Performance:**
- Indexes on `tournament_id`, `user_id`, and `category` for fast queries
- Functions use efficient JOINs
- Frontend caches data between user actions

**Data Integrity:**
- Unique constraint prevents duplicate categories
- CASCADE deletes when tournament or user is deleted
- Category values constrained by CHECK constraint

---

**Last Updated**: October 29, 2025  
**Status**: Implemented and Ready for Testing
