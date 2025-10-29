# Tournament Registration Setup Guide

This guide will help you set up the player registration system for tournaments.

## Database Setup

### 1. Execute the Registration Schema

Run the SQL file in your Supabase SQL Editor:

```bash
database/registrations_schema.sql
```

This will create:
- `registrations` table with all necessary fields
- RLS (Row Level Security) policies
- Indexes for performance
- Trigger for automatic `updated_at` timestamps

### 2. Verify Table Creation

After running the schema, verify in Supabase:

1. Go to **Table Editor**
2. Look for `registrations` table
3. Verify columns:
   - `id` (uuid, primary key)
   - `tournament_id` (uuid, foreign key)
   - `user_id` (uuid, foreign key)
   - `aoe2insights_url` (text)
   - `discord_username` (text)
   - `discord_avatar_url` (text, nullable)
   - `preferred_civs_flank` (jsonb)
   - `preferred_civs_pocket` (jsonb)
   - `preferred_position` (text - 'flank' or 'pocket')
   - `preferred_maps` (jsonb)
   - `notes` (text, nullable)
   - `status` (text - 'pending', 'approved', 'rejected')
   - `registered_at` (timestamptz)
   - `updated_at` (timestamptz)

### 3. Test RLS Policies

The following RLS policies are automatically created:

- **Public can view approved registrations**: Anyone can see approved registrations for non-draft tournaments
- **Users can view own registrations**: Users can always see their own registrations
- **Admins can view tournament registrations**: Tournament admins can see all registrations for their tournaments
- **Users can register for open tournaments**: Authenticated users can register when tournament status is 'registration_open'
- **Users can update own registrations**: Users can modify their registration while registration is open
- **Users can delete own registrations**: Users can withdraw from tournaments
- **Admins can update registration status**: Tournament admins can approve/reject registrations

## Features Implemented

### Player Registration Form

Players can register for tournaments with the following information:

1. **AoE2Insights URL** (required)
   - URL to player's AoE2Insights profile
   - Used for verifying player stats

2. **Preferred Position** (required)
   - Flank or Pocket
   - Determines player's role in 3v3 matches

3. **Preferred Civilizations for Flank** (required - select 2)
   - Top 2 civilization choices when playing flank position
   - Selected from active civilizations in database

4. **Preferred Civilizations for Pocket** (required - select 2)
   - Top 2 civilization choices when playing pocket position
   - Selected from active civilizations in database

5. **Preferred Maps** (required - select 3)
   - Top 3 map preferences from tournament map pool
   - Selected from maps assigned to the tournament

6. **Additional Notes** (optional)
   - Any extra information players want to share
   - Optional text field

### Participant Display

On tournament detail pages:

- **Participant Count**: Shows total number of registered players
- **Participant List**: Grid view of all registered players
  - Discord avatar (or initials if no avatar)
  - Discord username
  - Preferred position (Flank/Pocket)
- **Registration Button**: "Register Now" button for eligible players
- **Registration Status**: Shows if current user is already registered

### User Flow

1. **View Tournament**: Player navigates to tournament detail page
2. **Check Status**: System checks if registration is open
3. **Click Register**: Player clicks "Register Now" button
4. **Fill Form**: Player fills out registration form with preferences
5. **Submit**: Form validates all required fields (2 civs per position, 3 maps)
6. **Confirmation**: Player sees success message and is redirected to tournament page
7. **Display**: Player appears in participant list with avatar and position

### Validation

- URL format validation for AoE2Insights profile
- Exactly 2 civilizations required for each position (flank and pocket)
- Exactly 3 maps required from tournament map pool
- Position must be either 'flank' or 'pocket'
- User cannot register twice for same tournament (database unique constraint)
- Registration only allowed when tournament status is 'registration_open'

## Routes

New routes added:

- `/tournaments/:id/register` - Registration form page

## Services

New service files created:

- `client/src/services/registrationService.js` - Handles all registration operations
- `client/src/services/civilizationService.js` - Fetches civilization data

## Components

New page components:

- `client/src/pages/TournamentRegistration.jsx` - Complete registration form

Updated components:

- `client/src/pages/TournamentDetail.jsx` - Added participant list and register button
- `client/src/App.jsx` - Added registration route

## Testing the System

### 1. Publish a Tournament

1. Create a tournament (or use existing draft)
2. Select at least 3 maps
3. Click "Publish for Registration"
4. Verify status changes to "Registration Open"

### 2. Register as a Player

1. Navigate to tournament detail page
2. Click "Register Now" button
3. Fill out all required fields:
   - Enter AoE2Insights URL
   - Choose preferred position (Flank or Pocket)
   - Select 2 civs for flank position
   - Select 2 civs for pocket position
   - Select 3 maps from tournament pool
   - (Optional) Add notes
4. Click "Register"
5. Verify redirect to tournament page
6. Confirm you appear in participant list

### 3. Verify Participant Display

1. Check participant count is updated
2. Verify your Discord avatar appears
3. Confirm your username is displayed
4. Check your preferred position shows correctly

### 4. Test Duplicate Registration Prevention

1. Try to access registration page again
2. Should see "You are already registered" message
3. "Register Now" button should not appear on tournament page

### 5. Test as Different User

1. Sign in with different Discord account
2. Navigate to same tournament
3. Register with different preferences
4. Verify both participants show in list

## Admin Features (Future Enhancement)

Currently planned for later:

- View detailed registration information (civs, maps, notes)
- Approve/reject registrations (status management)
- Export participant list
- Email/Discord notifications
- Registration deadline enforcement

## Data Structure

### Registration Object Example

```json
{
  "id": "uuid",
  "tournament_id": "uuid",
  "user_id": "uuid",
  "aoe2insights_url": "https://aoe2insights.com/user/12345",
  "discord_username": "PlayerName#1234",
  "discord_avatar_url": "https://cdn.discordapp.com/avatars/...",
  "preferred_civs_flank": ["Britons", "Mayans"],
  "preferred_civs_pocket": ["Franks", "Teutons"],
  "preferred_position": "flank",
  "preferred_maps": ["Arabia", "Arena", "Black Forest"],
  "notes": "Available weekends only",
  "status": "approved",
  "registered_at": "2025-10-29T12:00:00Z",
  "updated_at": "2025-10-29T12:00:00Z"
}
```

## Troubleshooting

### Registration Button Not Showing

- Check tournament status is 'registration_open'
- Verify user is authenticated
- Confirm user is not the tournament admin
- Check if user already registered

### Cannot Select Civilizations

- Verify civilizations table has data
- Check `is_active` field is `true` for civilizations
- Confirm civilization images were uploaded

### Participant List Not Showing

- Verify registrations exist in database
- Check RLS policies are enabled
- Confirm tournament status is 'registration_open' or 'registration_closed'

### Discord Avatar Not Displaying

- Check user's Discord privacy settings
- Verify avatar URL in `raw_user_meta_data`
- Fallback to initials should display if no avatar

## Next Steps

After registration system is working:

1. Add admin view to see full registration details
2. Implement registration approval workflow (if needed)
3. Add registration deadline feature
4. Create team assignment/draft system
5. Send notifications when players register

## Notes

- Auto-approval is enabled (status defaults to 'approved')
- Discord username and avatar automatically captured from auth metadata
- One registration per user per tournament (enforced by unique constraint)
- Users can withdraw registration while status is 'registration_open'
- Tournament admins can view all registrations for their tournaments
