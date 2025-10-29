# AoE2 DE Tournament Manager - Project Plan

## Project Overview
A web-based tournament management system for Age of Empires II: Definitive Edition, designed to streamline tournament creation, player registration, team formation through captain drafting, and match scheduling.

## Technology Stack
- **Frontend**: React
- **Backend**: Supabase (Database + Auth)
- **Authentication**: Discord OAuth
- **Hosting**: TBD (Vercel/Netlify recommended for React)

---

## Core Features & User Flows

### 1. User Authentication
**Feature**: Discord OAuth Integration
- Users sign up/login using Discord account via Supabase Auth
- Supabase automatically stores Discord user data in `auth.users` table
- Session management via Supabase Auth
- User profile displays Discord information from auth metadata

**Note**: Supabase Auth automatically creates users in `auth.users` table with Discord OAuth. This table includes:
- `id` (UUID) - Use this as foreign key in all other tables
- `email`, `created_at`, `updated_at` - Auto-managed
- `raw_user_meta_data` - Contains Discord username, avatar, discriminator, etc.
- `raw_app_meta_data` - For custom metadata (roles, permissions)

**Database Tables**:
```sql
-- We create a public.profiles table for additional user data
-- This uses the same UUID as auth.users for the primary key
profiles (
  id: uuid (primary key, references auth.users.id ON DELETE CASCADE)
  discord_username: string
  discord_avatar_url: string
  aoe2_account_rights: string (nullable, stored after first tournament registration)
  bio: text (nullable)
  created_at: timestamp
  updated_at: timestamp
)
```

**Implementation Notes**:
- Use Supabase trigger to auto-create profile when user signs up
- Store only additional/custom data in `profiles` table
- Use `auth.users.id` as foreign key in all other tables (tournaments, registrations, etc.)
- Access Discord data from `auth.users.raw_user_meta_data` or cached in `profiles`

---

### 2. Tournament Creation & Configuration

#### 2.1 Basic Tournament Setup
**Feature**: Create Tournament
- User creates tournament with basic info:
  - Tournament name
  - Description
- Creator automatically becomes tournament admin

**Feature**: Tournament Type Selection
- **Current Format** (Phase 1):
  - **Round Robin with Grand Final** (ONLY option for now)
  - **Team Size**: Fixed 3v3
  
**Tournament Structure:**
- All teams play each other in round robin
- Each round robin match: All Played 3 (3 games always played, best score wins)
- Top 4 teams advance to playoffs
- **Semifinals** (3rd vs 4th, 1st vs 2nd): Best of 3
- **Grand Final** (winners): Best of 5

**Note**: Architecture is designed to support future additions:
- Different tournament formats (single/double elimination)
- Configurable team sizes
- Different round structures
- Currently intentionally minimal with clean extension points

#### 2.2 Map & Civ Draft Configuration
**Feature**: Draft Settings (Future Phase)
- **Current**: Not implemented in Phase 1
- **Planned**: 
  - Preset options (Best of 3, Best of 5)
  - Map pool selection
  - Civ draft settings

**Note**: Database schema includes fields for future configuration, but UI will not expose these options initially.

**Database Tables**:
```sql
tournaments (
  id: uuid (primary key)
  name: string
  description: text
  admin_id: uuid (foreign key -> auth.users(id))
  format: enum ('round_robin_gf') DEFAULT 'round_robin_gf'
    -- Currently only 'round_robin_gf' (Round Robin with Grand Final)
    -- Future: 'single_elimination', 'double_elimination', etc.
  team_size: integer DEFAULT 3
    -- Currently fixed at 3, but field allows future flexibility
  status: enum ('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed')
  registration_deadline: timestamp (nullable, future feature)
  start_date: timestamp (nullable, future feature)
  created_at: timestamp
  updated_at: timestamp
)

tournament_settings (
  id: uuid (primary key)
  tournament_id: uuid (foreign key -> tournaments)
  
  -- Round Robin Settings
  round_robin_format: text DEFAULT 'ap3'
    -- 'ap3' = All Played 3 (always play 3 games, winner has best score)
    -- Future: 'bo1', 'bo3', etc.
  
  -- Playoff Settings
  semifinal_format: text DEFAULT 'bo3'
    -- 'bo3' = Best of 3 for semifinals
  grandfinal_format: text DEFAULT 'bo5'
    -- 'bo5' = Best of 5 for grand final
  
  -- Future Configuration Fields (not used in Phase 1)
  map_pool_id: uuid (foreign key -> map_pools, nullable)
  civ_draft_enabled: boolean DEFAULT false
  civ_bans_per_team: integer (nullable)
  custom_settings: jsonb (nullable)
    -- For any future custom configurations
)

map_pools (
  id: uuid (primary key)
  name: string ('Standard', 'Custom', etc.)
  maps: jsonb (array of map names)
  is_default: boolean
  created_by: uuid (foreign key -> auth.users(id), nullable)
)

-- Note: map_pools table created but not used in Phase 1
-- Provides clean extension point for future map selection feature
```

---

### 3. Tournament Registration

#### 3.1 Publishing Tournament
**Feature**: Admin Publishes Tournament
- Admin reviews all settings
- Clicks "Publish for Registration"
- Tournament status changes to `registration_open`
- Tournament appears in public tournament list

#### 3.2 Player Registration
**Feature**: User Registration Form
- Players view open tournaments
- Click "Register"
- Fill registration form:
  - AoE2 account rights info (required)
  - Preferred civilizations (ranked list)
  - Preferred positions (1, 2, 3 for 3v3)
  - Preferred maps (ranked list)
  - Additional notes (optional)
- Submit registration

**Database Tables**:
```sql
registrations (
  id: uuid (primary key)
  tournament_id: uuid (foreign key -> tournaments)
  user_id: uuid (foreign key -> auth.users(id))
  aoe2_account_rights: string
  preferred_civs: jsonb (array of civ names)
  preferred_positions: jsonb (array of position numbers)
  preferred_maps: jsonb (array of map names)
  notes: text
  status: enum ('pending', 'approved', 'rejected')
  registered_at: timestamp
)
```

---

### 4. Team Formation via Captain Draft

#### 4.1 Player Categories
**Feature**: Admin Assigns Categories
- Admin reviews registered players
- Assigns players to skill categories:
  - S-Tier
  - A-Tier
  - B-Tier
  - C-Tier
  - (Customizable category names)
- Can view player preferences while categorizing

#### 4.2 Captain Selection
**Feature**: Admin Appoints Captains
- Admin selects captains from player pool
- Number of captains = number of teams
- Captains are removed from draftable player pool

#### 4.3 Bidding/Draft System
**Feature**: Snake Draft by Category
- Draft proceeds category by category (S → A → B → C)
- Within each category, snake pattern:
  - Round 1: Captain 1 → Captain 2 → Captain 3 → Captain 4
  - Round 2: Captain 4 → Captain 3 → Captain 2 → Captain 1
  - Round 3: Captain 1 → Captain 2 → Captain 3 → Captain 4
  - (Pattern continues)
- Live draft interface shows:
  - Current pick
  - Player info (preferences, category)
  - Timer per pick (optional)
  - Draft history

**Alternative**: Bidding War
- Each captain has budget (e.g., 1000 points)
- Players are auctioned one by one
- Captains bid for players
- Highest bidder gets the player

**Database Tables**:
```sql
player_categories (
  id: uuid (primary key)
  tournament_id: uuid (foreign key -> tournaments)
  user_id: uuid (foreign key -> auth.users(id))
  category: string ('S-Tier', 'A-Tier', etc.)
  assigned_at: timestamp
)

teams (
  id: uuid (primary key)
  tournament_id: uuid (foreign key -> tournaments)
  name: string (initially auto-generated, then customizable)
  logo_url: string (nullable)
  captain_id: uuid (foreign key -> auth.users(id))
  created_at: timestamp
)

team_members (
  id: uuid (primary key)
  team_id: uuid (foreign key -> teams)
  user_id: uuid (foreign key -> auth.users(id))
  is_captain: boolean
  draft_round: integer
  draft_order: integer
  position_preference: integer (1, 2, or 3)
)

draft_history (
  id: uuid (primary key)
  tournament_id: uuid (foreign key -> tournaments)
  team_id: uuid (foreign key -> teams)
  user_id: uuid (foreign key -> auth.users(id))
  pick_number: integer
  category: string
  timestamp: timestamp
)
```

#### 4.4 Team Customization
**Feature**: Admin Sets Team Names & Logos
- After draft completion, admin can:
  - Rename teams (or let captains rename their own team)
  - Upload team logos
  - Adjust team rosters if needed

---

### 5. Bracket Generation & Match Scheduling

#### 5.1 Bracket Creation
**Feature**: Auto-Generate Bracket
- **Round Robin Phase**:
  - All teams play each other once
  - Each match is Best of 1
  - Record wins/losses for standings
  
- **Playoff Phase**:
  - Top 4 teams from round robin advance
  - **Semifinals** (2 matches):
    - Match 1: 3rd place vs 4th place (Bo3)
    - Match 2: 1st place vs 2nd place (Bo3)
  - **Grand Final**:
    - Winners of semifinals (Bo5)

- Bracket is generated automatically when admin finalizes teams
- Admin can view/verify bracket before publishing

**Bracket Display Structure**:
```
Round Robin Standings:
1. Team A (6-0)
2. Team B (5-1)
3. Team C (4-2)
4. Team D (3-3)
... (remaining teams)

Playoffs:
Semifinal 1: Team C vs Team D (Bo3)
Semifinal 2: Team A vs Team B (Bo3)

Grand Final: [SF1 Winner] vs [SF2 Winner] (Bo5)
```

#### 5.2 Match Scheduling
**Feature**: Captain-Driven Scheduling
- Both team captains receive notification for match
- Either captain can propose match date/time
- Other captain approves or counter-proposes
- Once agreed, match is scheduled
- Automatic reminders before match (24h, 1h)

**Alternative**: Admin Sets Schedule
- Admin can override and set match times directly

**Database Tables**:
```sql
matches (
  id: uuid (primary key)
  tournament_id: uuid (foreign key -> tournaments)
  phase: enum ('round_robin', 'semifinal', 'grandfinal')
    -- Identifies which phase of tournament
  round: integer
    -- For round robin: round number (1, 2, 3...)
    -- For playoffs: null or fixed values
  match_number: integer
    -- Sequential match number
  team1_id: uuid (foreign key -> teams)
  team2_id: uuid (foreign key -> teams)
  scheduled_time: timestamp (nullable)
  status: enum ('pending', 'scheduled', 'in_progress', 'completed', 'disputed')
  winner_id: uuid (foreign key -> teams, nullable)
  best_of: integer
    -- 1 for round robin, 3 for semifinals, 5 for grand final
  created_at: timestamp
)

match_games (
  id: uuid (primary key)
  match_id: uuid (foreign key -> matches)
  game_number: integer
    -- Game 1, 2, 3, etc. within the match
  map: string (nullable, future feature)
  winner_id: uuid (foreign key -> teams, nullable)
  team1_score: integer
    -- Future use for detailed scoring
  team2_score: integer
  notes: text (nullable)
  played_at: timestamp (nullable)
)

schedule_proposals (
  id: uuid (primary key)
  match_id: uuid (foreign key -> matches)
  proposed_by: uuid (foreign key -> auth.users(id))
  proposed_time: timestamp
  status: enum ('pending', 'approved', 'rejected', 'countered')
  created_at: timestamp
)

-- Note: Schedule proposals may be Phase 2 feature
-- Initially admin might set schedules directly
```

---

### 6. Public Tournament View

#### 6.1 Tournament Bracket Display
**Feature**: Public Bracket View
- Clean, visual bracket display
- Shows all matches with:
  - Team names and logos
  - Match status (Scheduled, Live, Completed)
  - Scores
  - Scheduled times
- Updates in real-time as results are entered
- Responsive design for mobile/tablet

#### 6.2 Tournament Information
**Feature**: Tournament Dashboard
- Tournament details (name, format, dates)
- Team rosters with player info
- Match schedule (list view + calendar view)
- Standings (for Round Robin)
- Recent results
- Upcoming matches

#### 6.3 Team & Player Pages
**Feature**: Team Profile Pages
- Team name and logo
- Roster with player positions
- Match history
- Win/loss record
- Upcoming matches

**Feature**: Player Profile Pages
- Discord info
- Tournament participation history
- Stats across tournaments
- Preferred civs/maps/positions

---

### 7. Match Result Management

#### 7.1 Result Entry
**Feature**: Admin Enters Results
- Admin selects completed match
- Enters game-by-game results:
  - Map played
  - Winner
  - Score (if applicable)
- Can add notes/comments
- Submits result

#### 7.2 Live Bracket Updates
**Feature**: Real-Time Bracket Updates
- Bracket updates immediately after result submission
- Next matches are automatically generated (for elimination formats)
- Standings recalculated (for Round Robin)
- Notifications sent to teams for next matches

**Feature**: Result Disputes (Optional)
- Captains can flag result if incorrect
- Admin reviews and corrects if needed

---

### 8. Additional Features (Phase 2)

#### 8.1 Notifications System
- Discord webhook integration
- In-app notifications
- Email notifications (optional)
- Notification types:
  - Match scheduled
  - Match reminder
  - Result posted
  - Tournament status changes

#### 8.2 Statistics & Analytics
- Tournament stats dashboard
- Player performance metrics
- Map win rates
- Civ pick/ban statistics
- Historical data across tournaments

#### 8.3 Chat/Communication
- Per-tournament chat
- Per-team chat
- Direct messages between captains

#### 8.4 Streaming Integration
- Add stream links to matches
- Embed Twitch streams
- VOD archive

---

## User Roles & Permissions

### Public User (Not Logged In)
- View public tournaments
- View brackets, schedules, teams
- View player profiles

### Registered User
- All public user permissions
- Register for tournaments
- View own registration status
- Update profile

### Captain
- All registered user permissions
- Participate in draft
- Propose match schedules
- Communicate with other captains
- Manage team (if permitted by admin)

### Tournament Admin
- All captain permissions
- Create tournament
- Configure tournament settings
- Approve/reject registrations
- Assign player categories
- Appoint captains
- Manage draft
- Enter match results
- Modify brackets/schedules
- Manage teams (names, logos, rosters)

### Platform Admin
- All tournament admin permissions for all tournaments
- Manage users
- Manage map pools
- Platform settings

---

## Database Schema Summary

### Supabase Auth Tables (Built-in)
- `auth.users` - Main authentication table (managed by Supabase)
  - Contains: id, email, encrypted_password, email_confirmed_at, etc.
  - Discord data in: raw_user_meta_data (username, avatar, discriminator)
  - **Use `auth.users.id` as foreign key in all public tables**

### Core Tables (Public Schema)
1. `profiles` - Extended user profile data (linked to auth.users)
2. `tournaments` - Tournament main data
3. `tournament_settings` - Tournament configuration
4. `map_pools` - Map pool definitions
5. `registrations` - Player registrations
6. `player_categories` - Player skill categories
7. `teams` - Team information
8. `team_members` - Team rosters
9. `draft_history` - Draft picks log
10. `matches` - Match information
11. `match_games` - Individual game results
12. `schedule_proposals` - Match scheduling proposals

### Supporting Tables (Phase 2)
- `notifications` - User notifications
- `chat_messages` - Chat system
- `tournament_stats` - Cached statistics
- `user_stats` - Player statistics

### Database Triggers & Functions
```sql
-- Auto-create profile when user signs up
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, discord_username, discord_avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## User Interface Pages

### Public Pages
1. **Home** - Featured tournaments, upcoming matches
2. **Tournament List** - Browse all tournaments (filters: status, date, format)
3. **Tournament Detail** - Bracket, schedule, teams, info
4. **Team Profile** - Team roster, matches, stats
5. **Player Profile** - Player info, tournament history

### Authenticated Pages
6. **Dashboard** - User's tournaments, registrations, teams
7. **Profile Settings** - Edit profile, preferences
8. **Tournament Registration** - Registration form

### Captain Pages
9. **Draft Room** - Live draft interface
10. **Team Management** - Manage team (if permitted)
11. **Match Scheduling** - Propose/approve schedules

### Admin Pages
12. **Create Tournament** - Multi-step tournament creation wizard
13. **Tournament Admin Panel** - Central admin dashboard
14. **Player Categories** - Assign categories
15. **Captain Selection** - Appoint captains
16. **Draft Management** - Manage draft process
17. **Result Entry** - Enter match results
18. **Tournament Settings** - Modify settings

---

## Implementation Phases

### Phase 1: MVP (Core Features)
**Timeline**: 6-8 weeks

**Sprint 1** (Weeks 1-2): Foundation
- Project setup (React + Supabase)
- Discord OAuth integration
- Basic user authentication
- Database schema setup
- Home page + tournament list

**Sprint 2** (Weeks 3-4): Tournament Creation & Registration
- Tournament creation flow
- Tournament settings (format, maps, civs)
- Tournament publishing
- Player registration
- Admin panel basics

**Sprint 3** (Weeks 5-6): Team Formation
- Player categorization interface
- Captain selection
- Snake draft implementation
- Team creation
- Team customization (name, logo)

**Sprint 4** (Weeks 7-8): Brackets & Results
- Bracket generation (all formats)
- Public bracket view
- Match scheduling (basic)
- Result entry
- Live bracket updates

### Phase 2: Enhanced Features
**Timeline**: 4-6 weeks

- Advanced scheduling (captain proposals)
- Notifications system
- Statistics dashboard
- Team/player profile pages
- UI/UX polish
- Mobile responsiveness

### Phase 3: Advanced Features
**Timeline**: 4-6 weeks

- Chat system
- Streaming integration
- Advanced analytics
- Platform admin tools
- Multi-tournament support improvements

---

## Technical Architecture

### Frontend (React)
**Structure**:
```
src/
├── components/
│   ├── auth/
│   ├── tournament/
│   ├── team/
│   ├── bracket/
│   ├── draft/
│   └── common/
├── pages/
│   ├── Home.jsx
│   ├── TournamentList.jsx
│   ├── TournamentDetail.jsx
│   ├── CreateTournament.jsx
│   ├── AdminPanel.jsx
│   ├── Draft.jsx
│   └── ...
├── hooks/
│   ├── useAuth.js
│   ├── useTournament.js
│   ├── useRealtime.js
│   └── ...
├── services/
│   ├── supabase.js
│   ├── discord.js
│   └── api.js
├── utils/
│   ├── bracket.js
│   ├── draft.js
│   └── ...
└── App.jsx
```

**Key Libraries**:
- React Router - Navigation
- React Query - Data fetching/caching
- Supabase JS Client - Backend integration
- Tailwind CSS - Styling
- React Hook Form - Form handling
- React DnD - Drag & drop for draft
- Date-fns - Date manipulation
- React Bracket - Bracket visualization

### Backend (Supabase)
**Components**:
- **Database**: PostgreSQL with Row Level Security
- **Auth**: Discord OAuth provider
- **Storage**: Team logos, tournament images
- **Real-time**: Live bracket updates, draft room
- **Edge Functions**: Complex business logic (bracket generation, draft validation)

**Row Level Security Policies**:
- Users can read public tournament data
- Users can insert their own registrations
- Only tournament admins can modify their tournaments
- Only admins can insert match results

---

## Security Considerations

1. **Authentication**: Discord OAuth via Supabase
2. **Authorization**: RLS policies for data access
3. **Input Validation**: Client-side + database constraints
4. **API Rate Limiting**: Supabase built-in limits
5. **File Upload**: Validate file types/sizes for logos
6. **XSS Prevention**: Sanitize user input (team names, etc.)

---

## Deployment Strategy

### Development
- Local Supabase instance (Docker)
- Local React dev server
- Discord OAuth test app

### Staging
- Supabase staging project
- Vercel preview deployment
- Discord OAuth staging app

### Production
- Supabase production project
- Vercel production deployment
- Discord OAuth production app
- Custom domain
- SSL certificates (handled by Vercel)

---

## Performance Optimization

1. **Lazy Loading**: Code splitting for pages
2. **Image Optimization**: Compress team logos
3. **Caching**: React Query for API responses
4. **Database Indexing**: Index foreign keys, commonly queried fields
5. **Real-time Subscriptions**: Only subscribe to necessary data
6. **Pagination**: For tournament lists, match history

---

## Testing Strategy

### Unit Tests
- Utility functions (bracket generation, draft logic)
- React hooks
- Component logic

### Integration Tests
- API calls to Supabase
- Authentication flows
- Form submissions

### E2E Tests
- User registration flow
- Tournament creation flow
- Draft process
- Result entry

### Manual Testing
- Cross-browser compatibility
- Mobile responsiveness
- Discord OAuth flow

---

## Success Metrics

### Phase 1 (MVP)
- [ ] Successfully create and configure tournament
- [ ] At least 10 users can register
- [ ] Complete draft with multiple teams
- [ ] Generate bracket correctly
- [ ] Enter and display results
- [ ] Public bracket view works

### Phase 2
- [ ] Scheduling system works smoothly
- [ ] Notifications sent reliably
- [ ] Statistics displayed accurately
- [ ] Mobile experience is good

### Long-term
- [ ] Host 5+ tournaments successfully
- [ ] 100+ registered users
- [ ] Positive user feedback
- [ ] Low bug count
- [ ] Fast page load times (<2s)

---

## Open Questions & Decisions Needed

1. ~~**Draft Method**: Snake draft or bidding war?~~ → **Decision: Snake draft** (simpler)
2. **Captain Permissions**: Can captains rename teams or admin only? → **Recommend: Captains can**
3. **Match Scheduling**: Captain-driven or admin-only? → **Recommend: Admin-only for Phase 1, captain-driven later**
4. **Registration Approval**: Auto-approve or admin approval? → **Recommend: Auto-approve with admin reject option**
5. ~~**Team Size**: Fixed 3v3 or configurable?~~ → **Decision: Fixed 3v3** (configurable later)
6. **Map Draft**: Automated or manual per match? → **Phase 2 feature**
7. **Multiple Tournaments**: Can user be in multiple tournaments simultaneously? → **Recommend: Yes**
8. ~~**Tournament Format**~~ → **Decision: Round Robin with Grand Final only** (Phase 1)

---

## Architecture Notes for Future Extensions

### Clean Extension Points

**Tournament Formats** (`tournaments.format` field):
- Current: Only `'round_robin_gf'`
- Future: Add enums like `'single_elimination'`, `'double_elimination'`, `'swiss'`
- Extension: Match generation logic switches based on format type

**Team Sizes** (`tournaments.team_size` field):
- Current: Fixed at 3
- Future: Make configurable in UI (1v1, 2v2, 3v3, 4v4)
- Extension: Validation and team formation logic already handles dynamic sizes

**Match Settings** (`tournament_settings` table):
- Current: Hardcoded Bo1/Bo3/Bo5 per phase
- Future: Make configurable per tournament
- Extension: UI exposes these fields, logic reads from DB instead of hardcoded

**Map/Civ Selection** (`map_pools` table and settings):
- Current: Tables exist but not used
- Future: Add UI for map pool selection and civ drafting
- Extension: Already structured in DB, just needs UI + game result tracking

### Minimal Footprint Strategy

**Phase 1 UI**:
- Single page: "Create Tournament" with only Name + Description
- Format automatically set to Round Robin with Grand Final
- Team size automatically set to 3
- Settings automatically set to Bo1/Bo3/Bo5

**Database**:
- Full schema implemented with future fields
- Default values handle current simple case
- No UI changes needed when adding features - just expose fields

**Code Structure**:
```
utils/
  bracketGenerator.js
    - generateRoundRobin()        # Current
    - generateSingleElimination() # Future
    - generateDoubleElimination() # Future
    - generateSwiss()             # Future
  
  matchConfig.js
    - getMatchFormat(phase, tournamentSettings) # Reads from DB
    - Returns Bo1/Bo3/Bo5 based on settings
```

This approach keeps current implementation minimal while making future additions trivial.

---

## Next Steps

1. **Review & Refine**: Review this plan, make adjustments
2. **Setup Development Environment**: 
   - Create Supabase project
   - Setup Discord OAuth app
   - Initialize React project
3. **Database Schema**: Implement tables in Supabase
4. **Start Sprint 1**: Begin with auth and basic UI
5. **Regular Reviews**: Weekly progress reviews and adjustments

---

## Resources & References

### AoE2 Resources
- Map pool lists
- Civilization lists
- Tournament formats documentation

### Technical Documentation
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Discord OAuth](https://discord.com/developers/docs/topics/oauth2)

### Design Inspiration
- Challonge.com (bracket view)
- Battlefy.com (tournament management)
- Liquipedia (tournament information)

---

## Notes

- Keep UI simple and intuitive - tournament admins may not be tech-savvy
- Focus on mobile experience - many users will view on phones
- Real-time updates are crucial for draft and bracket views
- Discord integration should be seamless
- Consider AoE2 community preferences and terminology
- Plan for future features: replays, coaching tools, practice matches

---

**Document Version**: 1.0  
**Last Updated**: October 29, 2025  
**Status**: Planning Phase
