# AoE2 Tournament Manager - Discord Auth App

A minimal React application with Discord OAuth authentication using Supabase.

## Features

✅ Sign in with Discord OAuth  
✅ Automatic user registration for new users  
✅ Protected routes for authenticated users  
✅ Display Discord username and avatar  
✅ Clean, minimal UI  

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool
- **Supabase** - Backend (Auth + Database)
- **React Router** - Routing
- **Discord OAuth** - Authentication

## Setup Instructions

### 1. Supabase Setup

1. Go to [Supabase](https://app.supabase.com) and create a new project
2. Once created, go to **Settings** → **API** and copy:
   - Project URL
   - Anon/Public key

### 2. Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **OAuth2** section
4. Add redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Replace `your-project-ref` with your actual Supabase project reference
5. Copy your **Client ID** and **Client Secret**

### 3. Configure Discord in Supabase

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Discord** provider
3. Enter your Discord **Client ID** and **Client Secret**
4. Save changes

### 4. Environment Variables

1. In the `client` folder, create a `.env` file:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Replace the values with your actual Supabase credentials

### 5. Install Dependencies

```bash
cd client
npm install
```

### 6. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx    # Route wrapper for auth
│   ├── contexts/
│   │   └── AuthContext.jsx       # Auth state management
│   ├── lib/
│   │   └── supabase.js           # Supabase client config
│   ├── pages/
│   │   ├── Login.jsx             # Login page with Discord button
│   │   ├── Login.css
│   │   ├── Profile.jsx           # User profile page
│   │   └── Profile.css
│   ├── App.jsx                   # Main app with routing
│   ├── App.css
│   └── main.jsx
├── .env                          # Environment variables (create this)
├── .env.example                  # Environment template
└── package.json
```

## How It Works

### Authentication Flow

1. User clicks "Sign in with Discord" on login page
2. Redirected to Discord for authorization
3. Discord redirects back to app with auth code
4. Supabase exchanges code for session token
5. User info stored in `auth.users` table automatically
6. User redirected to profile page
7. Profile page displays Discord username and avatar

### Code Highlights

**AuthContext** (`src/contexts/AuthContext.jsx`)
- Manages authentication state
- Provides `signInWithDiscord()` and `signOut()` methods
- Listens for auth state changes
- Available throughout app via `useAuth()` hook

**ProtectedRoute** (`src/components/ProtectedRoute.jsx`)
- Wraps routes requiring authentication
- Redirects to login if user not authenticated
- Shows loading state while checking auth

**Supabase Client** (`src/lib/supabase.js`)
- Initializes Supabase connection
- Uses environment variables for config
- Single instance used throughout app

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | `eyJhbGc...` |

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Notes

- User data is stored in Supabase's built-in `auth.users` table
- Discord username and avatar are in `auth.users.raw_user_meta_data`
- No additional profile table needed for this minimal version
- Sessions are managed automatically by Supabase

## Next Steps

To extend this app:
- Add tournament creation functionality
- Create player registration forms
- Build team management features
- Add database tables as per the project plan

## Troubleshooting

**"Missing Supabase environment variables" error**
- Make sure you created `.env` file in the `client` folder
- Check that variable names start with `VITE_`
- Restart dev server after creating/modifying `.env`

**Discord OAuth not working**
- Verify redirect URL in Discord Developer Portal matches Supabase callback URL
- Check that Discord provider is enabled in Supabase
- Ensure Client ID and Secret are correct

**User not redirecting after login**
- Check browser console for errors
- Verify Supabase project is active
- Check that redirect URL is configured correctly


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
