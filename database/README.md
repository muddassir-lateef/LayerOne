# Database Setup Instructions

## Step 1: Run the Database Migration

1. **Go to your Supabase project**
   - Open https://app.supabase.com
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste the schema**
   - Open `database/schema.sql` file
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the migration**
   - Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for "Success. No rows returned"

5. **Verify tables were created**
   - Click "Table Editor" in the left sidebar
   - You should see:
     - `tournaments` table
     - `tournament_settings` table

## Step 2: Test the Setup

### Create a Test Tournament

Run this query in SQL Editor:

```sql
-- View all tournaments
SELECT 
  t.id,
  t.name,
  t.description,
  t.status,
  t.format,
  t.team_size,
  ts.round_robin_format,
  ts.semifinal_format,
  ts.grandfinal_format,
  t.created_at
FROM public.tournaments t
LEFT JOIN public.tournament_settings ts ON t.id = ts.tournament_id
ORDER BY t.created_at DESC;
```

This should return an empty result set (no rows) if you haven't created any tournaments yet.

## Step 3: Test Row Level Security

The RLS policies ensure:
- ✅ Users can only see their own draft tournaments
- ✅ Users can see all published tournaments
- ✅ Users can only create tournaments as themselves
- ✅ Users can only modify their own tournaments

## What Was Created

### Tables

**tournaments**
- Stores main tournament information
- Auto-generates UUID
- Links to auth.users via admin_id
- Tracks tournament status (draft → registration_open → etc.)

**tournament_settings**
- Automatically created when tournament is created (via trigger)
- Stores match format settings (AP3, Bo3, Bo5)
- Ready for future customization

**AP3 Format:**
- "All Played 3" means always play 3 games
- Winner is team with best score (2-1, 3-0, etc.)
- Not "Best of 3" (which stops at 2 wins)

### Triggers

1. **Auto-update timestamps**
   - `updated_at` automatically updates on any change

2. **Auto-create settings**
   - When tournament is created, settings are auto-created with defaults

### Security

**Row Level Security (RLS) Policies:**
- SELECT: Users see their own tournaments + public tournaments
- INSERT: Users can create tournaments (become admin automatically)
- UPDATE: Only tournament admin can update
- DELETE: Only tournament admin can delete

## Troubleshooting

**Error: "relation 'tournaments' already exists"**
- Tables were already created
- You can skip this migration

**Error: "permission denied"**
- Make sure you're using the correct Supabase project
- Check that you're signed in as project owner

**Trigger not working**
- Run the schema again (it will recreate triggers)
- Or manually create tournament_settings for existing tournaments

## Next Steps

After running this migration:
1. Start your React dev server: `cd client && npm run dev`
2. Sign in with Discord
3. Try creating a tournament from the dashboard
4. Verify it appears in your tournaments list

## Database Schema Diagram

```
auth.users (Supabase built-in)
    ↓ (admin_id)
tournaments
    ├── id (PK)
    ├── name
    ├── description
    ├── admin_id (FK → auth.users)
    ├── format
    ├── team_size
    ├── status
    ├── created_at
    └── updated_at
    
tournaments
    ↓ (tournament_id)
tournament_settings
    ├── id (PK)
    ├── tournament_id (FK → tournaments)
    ├── round_robin_format
    ├── semifinal_format
    ├── grandfinal_format
    └── custom_settings (JSONB)
```
