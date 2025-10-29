# Quick Start Guide - Discord Auth Setup

## What You Have Now

A minimal React app with Discord OAuth authentication that:
- ✅ Lets users sign in with Discord
- ✅ Automatically registers new users
- ✅ Shows user profile with Discord username and avatar
- ✅ Uses Supabase for authentication

## Before You Start

You need to set up two things:
1. **Supabase Project** (Backend/Database)
2. **Discord OAuth App** (Authentication)

---

## Step-by-Step Setup

### Step 1: Create Supabase Project (5 minutes)

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Fill in:
   - **Name**: `aoe2-tournament-manager` (or whatever you like)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Click **"Create new project"** and wait ~2 minutes for setup

### Step 2: Get Supabase Credentials

1. In your Supabase project, click **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://abcdefg.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)
3. Keep these handy - you'll need them soon!

### Step 3: Create Discord Application (3 minutes)

1. Go to https://discord.com/developers/applications
2. Click **"New Application"**
3. Name it: `AoE2 Tournament Manager`
4. Click **"Create"**

### Step 4: Set Up Discord OAuth

1. In your Discord app, go to **OAuth2** → **General**
2. Copy the **Client ID** (save it!)
3. Click **"Reset Secret"** → **"Yes, do it!"**
4. Copy the **Client Secret** (save it!)
5. In **Redirects** section, click **"Add Redirect"**
6. Add this URL (replace `abcdefg` with YOUR Supabase project reference):
   ```
   https://abcdefg.supabase.co/auth/v1/callback
   ```
   **How to find your project reference**: It's the first part of your Supabase URL
   - Example: If URL is `https://xyzproject.supabase.co`, use `xyzproject`
7. Click **"Save Changes"**

### Step 5: Configure Discord in Supabase (2 minutes)

1. Go back to your Supabase project
2. Click **Authentication** (left menu) → **Providers**
3. Find **Discord** in the list and click to expand it
4. Toggle **"Enable"** to ON
5. Paste your Discord **Client ID**
6. Paste your Discord **Client Secret**
7. Click **"Save"**

### Step 6: Configure Your React App (2 minutes)

1. Open your project in VS Code
2. Navigate to the `client` folder
3. Create a new file called `.env` (notice the dot at the start!)
4. Add these two lines (replace with YOUR values):
   ```
   VITE_SUPABASE_URL=https://abcdefg.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 7: Run the App! 🚀

1. Open terminal in VS Code
2. Navigate to client folder:
   ```bash
   cd client
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open your browser to: http://localhost:5173

---

## Testing Your App

1. You should see the login page with "Sign in with Discord" button
2. Click the button
3. You'll be redirected to Discord to authorize
4. After authorizing, you'll be redirected back to the app
5. You should now see your profile page with:
   - Your Discord username
   - Your Discord avatar
   - Your Discord ID
   - A "Sign Out" button

🎉 **Success!** Your Discord authentication is working!

---

## File Structure Overview

```
LayerOne/
├── TOURNAMENT_MANAGER_PLAN.md    # Full project plan
├── SETUP_GUIDE.md                # This file
└── client/                       # React app
    ├── src/
    │   ├── lib/
    │   │   └── supabase.js       # Supabase configuration
    │   ├── contexts/
    │   │   └── AuthContext.jsx   # Authentication logic
    │   ├── components/
    │   │   └── ProtectedRoute.jsx # Protected route wrapper
    │   ├── pages/
    │   │   ├── Login.jsx         # Login page
    │   │   └── Profile.jsx       # Profile page
    │   └── App.jsx               # Main app with routing
    ├── .env                      # Your environment variables (CREATE THIS!)
    ├── .env.example              # Template
    └── README.md                 # Detailed documentation
```

---

## Common Issues & Solutions

### ❌ "Missing Supabase environment variables"
**Solution**: 
- Make sure `.env` file is in the `client` folder
- Variable names MUST start with `VITE_`
- Restart dev server after creating `.env`

### ❌ Discord OAuth not working
**Solution**:
- Double-check redirect URL in Discord Developer Portal
- Make sure it matches: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- Verify Discord provider is enabled in Supabase
- Check Client ID and Secret are correct

### ❌ Page shows "Loading..." forever
**Solution**:
- Check browser console (F12) for errors
- Verify Supabase credentials are correct in `.env`
- Make sure Supabase project is active (not paused)

### ❌ Can't see Discord avatar
**Solution**:
- Some users may not have avatars set
- This is normal - the app will still show username

---

## What's Next?

Now that authentication is working, you can:

1. **Phase 1**: Start building tournament creation features
2. **Phase 2**: Add team formation and draft system
3. **Phase 3**: Build bracket and match scheduling

Refer to `TOURNAMENT_MANAGER_PLAN.md` for the full roadmap!

---

## Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Discord Developer Docs**: https://discord.com/developers/docs
- **React Router Docs**: https://reactrouter.com
- **Vite Docs**: https://vite.dev

---

**Last Updated**: October 29, 2025  
**Status**: ✅ Basic Authentication Complete
