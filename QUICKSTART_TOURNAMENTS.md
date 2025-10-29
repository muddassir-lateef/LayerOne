# 🚀 Quick Start - Tournament Creation Feature

## Prerequisites

✅ You already have Discord auth working  
✅ Your `.env` file is configured  
✅ Supabase project is set up  

## Step 1: Run Database Migration (2 minutes)

1. Open https://app.supabase.com
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy everything from `database/schema.sql`
5. Paste and click **Run**
6. Wait for "Success" ✅

## Step 2: Start the App (30 seconds)

```bash
cd client
npm run dev
```

## Step 3: Test It! (1 minute)

1. Open http://localhost:5173
2. Sign in with Discord
3. You'll see the **Dashboard** (empty at first)
4. Click **"Create Tournament"**
5. Fill in:
   - Name: "Test Tournament"
   - Description: "My first tournament"
6. Click **"Create Tournament"**
7. 🎉 You'll see your tournament card on the dashboard!

---

## What You Can Do Now

✅ Create tournaments  
✅ View your tournaments  
✅ See tournament status  
✅ Navigate with top menu  
✅ Access profile  
✅ Sign out  

## File Structure

```
LayerOne/
├── database/
│   ├── schema.sql              # ← RUN THIS IN SUPABASE
│   └── README.md               # Detailed DB instructions
├── client/
│   └── src/
│       ├── services/
│       │   └── tournamentService.js  # API functions
│       ├── components/
│       │   └── Navigation.jsx        # Top nav bar
│       └── pages/
│           ├── Dashboard.jsx         # Main page
│           └── CreateTournament.jsx  # Create form
└── TOURNAMENT_CREATION_FEATURE.md    # Full documentation
```

## Routes

- `/` - Login page (public)
- `/dashboard` - Your tournaments (protected)
- `/tournaments/create` - Create new tournament (protected)
- `/profile` - Your profile (protected)

## Database Tables

**tournaments** - Main tournament data  
**tournament_settings** - Auto-created with defaults  

Both have Row Level Security enabled!

---

## Troubleshooting

**"relation 'tournaments' does not exist"**
→ Run the database migration (Step 1)

**"Failed to create tournament"**
→ Check browser console for errors  
→ Verify you're signed in  
→ Check Supabase tables exist

**Empty dashboard won't load**
→ Check browser console  
→ Verify `.env` file is correct  
→ Check Supabase project is active

---

## What's Next?

See `TOURNAMENT_MANAGER_PLAN.md` for the roadmap:

**Phase 2**: Player registration  
**Phase 3**: Team formation & draft  
**Phase 4**: Brackets & matches  

---

**Need Help?**  
- Full docs: `TOURNAMENT_CREATION_FEATURE.md`
- DB setup: `database/README.md`
- Original plan: `TOURNAMENT_MANAGER_PLAN.md`

---

**Status**: ✅ Ready to Use!  
**Time to Setup**: ~3 minutes
