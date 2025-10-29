# 🚀 Quick Reference - Discord Auth App

## Project Structure
```
LayerOne/
├── 📄 TOURNAMENT_MANAGER_PLAN.md      # Complete project roadmap
├── 📄 SETUP_GUIDE.md                  # Step-by-step setup instructions
├── 📄 IMPLEMENTATION_SUMMARY.md       # What was built & how it works
└── client/                            # React application
    ├── 📄 .env                        # ⚠️ CREATE THIS - Your credentials
    ├── 📄 .env.example                # Template for .env
    ├── 📄 README.md                   # Detailed documentation
    └── src/
        ├── lib/
        │   └── supabase.js            # Supabase config
        ├── contexts/
        │   └── AuthContext.jsx        # Auth state & hooks
        ├── components/
        │   └── ProtectedRoute.jsx     # Protected route wrapper
        ├── pages/
        │   ├── Login.jsx              # Login page
        │   ├── Login.css
        │   ├── Profile.jsx            # Profile page
        │   └── Profile.css
        ├── App.jsx                    # Main app + routing
        ├── App.css                    # Global styles
        └── index.css                  # Base reset
```

## Environment Setup (.env file)
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Commands
```bash
# Install dependencies (first time)
cd client
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Routes
- `/` - Login page (public)
- `/profile` - User profile (protected)

## Key Components

### useAuth() Hook
```jsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, loading, signInWithDiscord, signOut } = useAuth();
  
  // user: Current user object or null
  // loading: Boolean - auth state loading
  // signInWithDiscord: Function to trigger OAuth
  // signOut: Function to log out
}
```

### Accessing User Data
```jsx
const { user } = useAuth();

// Discord username
const username = user?.user_metadata?.full_name || 
                 user?.user_metadata?.name;

// Discord avatar
const avatar = user?.user_metadata?.avatar_url;

// User ID
const userId = user?.id;
```

### Protected Route
```jsx
<Route 
  path="/protected" 
  element={
    <ProtectedRoute>
      <YourComponent />
    </ProtectedRoute>
  } 
/>
```

## Supabase Setup Checklist
- [ ] Create Supabase project
- [ ] Copy Project URL and Anon Key
- [ ] Enable Discord auth provider
- [ ] Add Discord Client ID & Secret

## Discord OAuth Checklist
- [ ] Create Discord application
- [ ] Copy Client ID & Secret
- [ ] Add redirect URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- [ ] Save changes

## Testing Flow
1. Open http://localhost:5173
2. Click "Sign in with Discord"
3. Authorize on Discord
4. Should redirect to /profile
5. See username and avatar
6. Click "Sign Out"
7. Should redirect to /

## Common Issues

**Environment variables not working?**
- File must be named exactly `.env` (with the dot)
- Must be in `client` folder
- Variables must start with `VITE_`
- Restart dev server after changes

**Discord OAuth not working?**
- Check redirect URL matches exactly
- Verify Discord provider enabled in Supabase
- Check Client ID & Secret are correct

**Page stuck on "Loading..."?**
- Check browser console (F12)
- Verify Supabase credentials
- Check Supabase project is active

## Next Features to Build
1. Home/Dashboard page
2. Tournament creation form
3. Tournament list view
4. Database tables for tournaments

## Useful Links
- Supabase: https://app.supabase.com
- Discord Dev Portal: https://discord.com/developers/applications
- React Router: https://reactrouter.com
- Vite: https://vite.dev

---
**Status**: ✅ Authentication Complete  
**Last Updated**: October 29, 2025
