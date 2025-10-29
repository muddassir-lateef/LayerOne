# Map Selection Feature - Implementation Guide

## Overview

Allow tournament creators to select a map pool (3-7 maps) during tournament creation. Maps are displayed with images and descriptions.

---

## Implementation Steps

### Step 1: Apply Database Schema

```bash
# In Supabase SQL Editor, run:
```

Copy and paste the entire contents of `database/maps_schema.sql` into Supabase SQL Editor and execute it.

This creates:
- ✅ `maps` table
- ✅ `tournament_maps` junction table
- ✅ RLS policies
- ✅ Indexes

---

### Step 2: Upload Map Images

Follow the complete guide in `MAP_IMAGES_SETUP.md`:

1. Create `map-images` storage bucket (public)
2. Upload 9 map images (arabia.jpg, arena.jpg, etc.)
3. Insert map data with image URLs into database

**Quick Test Query:**

```sql
SELECT COUNT(*) FROM public.maps WHERE is_active = true;
-- Should return 9 (or however many maps you added)
```

---

### Step 3: Create Map Service

Create `client/src/services/mapService.js`:

```javascript
import { supabase } from '../lib/supabase';

/**
 * Get all active maps for selection
 */
export async function getActiveMaps() {
  const { data, error } = await supabase
    .from('maps')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error fetching maps:', error);
    throw error;
  }

  return data;
}

/**
 * Add selected maps to a tournament
 * @param {string} tournamentId - UUID of tournament
 * @param {string[]} mapIds - Array of map UUIDs
 */
export async function addMapsToTournament(tournamentId, mapIds) {
  // Create records for junction table
  const records = mapIds.map(mapId => ({
    tournament_id: tournamentId,
    map_id: mapId
  }));

  const { error } = await supabase
    .from('tournament_maps')
    .insert(records);

  if (error) {
    console.error('Error adding maps to tournament:', error);
    throw error;
  }
}

/**
 * Get maps selected for a tournament
 */
export async function getTournamentMaps(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_maps')
    .select(`
      map_id,
      maps (
        id,
        name,
        description,
        image_url
      )
    `)
    .eq('tournament_id', tournamentId);

  if (error) {
    console.error('Error fetching tournament maps:', error);
    throw error;
  }

  // Flatten the structure
  return data.map(item => item.maps);
}

/**
 * Update tournament map pool (replace existing)
 */
export async function updateTournamentMaps(tournamentId, mapIds) {
  // Delete existing selections
  const { error: deleteError } = await supabase
    .from('tournament_maps')
    .delete()
    .eq('tournament_id', tournamentId);

  if (deleteError) {
    console.error('Error removing old maps:', deleteError);
    throw deleteError;
  }

  // Add new selections
  if (mapIds.length > 0) {
    await addMapsToTournament(tournamentId, mapIds);
  }
}
```

---

### Step 4: Create MapSelector Component

Create `client/src/components/MapSelector.jsx`:

```javascript
import { useState, useEffect } from 'react';
import { getActiveMaps } from '../services/mapService';

export default function MapSelector({ selectedMapIds = [], onChange }) {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaps();
  }, []);

  async function loadMaps() {
    try {
      const data = await getActiveMaps();
      setMaps(data);
    } catch (error) {
      console.error('Failed to load maps:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleMap(mapId) {
    const isSelected = selectedMapIds.includes(mapId);
    let newSelection;

    if (isSelected) {
      // Remove map
      newSelection = selectedMapIds.filter(id => id !== mapId);
    } else {
      // Add map (max 7)
      if (selectedMapIds.length >= 7) {
        alert('Maximum 7 maps allowed in a pool');
        return;
      }
      newSelection = [...selectedMapIds, mapId];
    }

    onChange(newSelection);
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Loading maps...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Select 3-7 maps for your tournament pool ({selectedMapIds.length} selected)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {maps.map((map) => {
          const isSelected = selectedMapIds.includes(map.id);
          
          return (
            <button
              key={map.id}
              type="button"
              onClick={() => toggleMap(map.id)}
              className={`
                relative overflow-hidden rounded-lg border-2 transition-all text-left
                ${isSelected 
                  ? 'border-indigo-600 shadow-lg ring-2 ring-indigo-600 ring-offset-2' 
                  : 'border-gray-200 hover:border-indigo-400'
                }
              `}
            >
              {/* Map Image */}
              <div className="aspect-video w-full overflow-hidden bg-gray-100">
                <img 
                  src={map.image_url} 
                  alt={map.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Map Info */}
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {map.name}
                  {isSelected && (
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {map.description}
                </p>
              </div>

              {/* Selection Badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">
                  SELECTED
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Validation Warning */}
      {selectedMapIds.length > 0 && selectedMapIds.length < 3 && (
        <p className="mt-4 text-sm text-amber-600">
          ⚠️ Please select at least 3 maps
        </p>
      )}
    </div>
  );
}
```

---

### Step 5: Update CreateTournament Page

Modify `client/src/pages/CreateTournament.jsx`:

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTournament } from '../services/tournamentService';
import { addMapsToTournament } from '../services/mapService';
import MapSelector from '../components/MapSelector';

export default function CreateTournament() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [selectedMapIds, setSelectedMapIds] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validation
    if (selectedMapIds.length < 3) {
      alert('Please select at least 3 maps for the tournament pool');
      return;
    }
    if (selectedMapIds.length > 7) {
      alert('Maximum 7 maps allowed in the pool');
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Create tournament
      const tournament = await createTournament(formData);
      
      // Step 2: Add selected maps
      await addMapsToTournament(tournament.id, selectedMapIds);
      
      // Success! Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Failed to create tournament. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Tournament</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Tournament Details */}
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Tournament Details</h2>
          
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Tournament Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              placeholder="e.g., Winter Championship 2024"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              placeholder="Tournament description, rules, schedule..."
            />
          </div>

          {/* Format Info */}
          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="font-medium text-indigo-900 mb-2">Tournament Format</h3>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• <strong>3v3 Teams</strong> - Each team has 3 players</li>
              <li>• <strong>Round Robin</strong> - All teams play each other (AP3 - All Played 3)</li>
              <li>• <strong>Grand Final</strong> - Top 2 teams from Round Robin advance</li>
              <li>• <strong>Semifinals</strong> - Best of 3 (Bo3)</li>
              <li>• <strong>Grand Final</strong> - Best of 5 (Bo5)</li>
            </ul>
          </div>
        </div>

        {/* Map Pool Selection */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Map Pool *</h2>
          <MapSelector 
            selectedMapIds={selectedMapIds}
            onChange={setSelectedMapIds}
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

### Step 6: Display Selected Maps (Optional)

To show selected maps on tournament details page, update your tournament detail view:

```javascript
import { useEffect, useState } from 'react';
import { getTournamentMaps } from '../services/mapService';

// Inside your TournamentDetail component:
const [maps, setMaps] = useState([]);

useEffect(() => {
  async function loadMaps() {
    const tournamentMaps = await getTournamentMaps(tournamentId);
    setMaps(tournamentMaps);
  }
  loadMaps();
}, [tournamentId]);

// Render in your JSX:
<div className="bg-white shadow rounded-lg p-6">
  <h2 className="text-xl font-semibold mb-4">Map Pool</h2>
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
    {maps.map(map => (
      <div key={map.id} className="text-center">
        <img 
          src={map.image_url} 
          alt={map.name}
          className="w-full aspect-video object-cover rounded-lg mb-2"
        />
        <p className="text-sm font-medium">{map.name}</p>
      </div>
    ))}
  </div>
</div>
```

---

## Testing Checklist

### 1. Database Setup
- [ ] `maps_schema.sql` executed in Supabase
- [ ] `map-images` storage bucket created (public)
- [ ] Map images uploaded to storage
- [ ] Map data inserted with correct image URLs
- [ ] Query returns 9 active maps: `SELECT * FROM maps;`

### 2. Frontend Integration
- [ ] `mapService.js` created with all functions
- [ ] `MapSelector.jsx` component created
- [ ] `CreateTournament.jsx` updated with map selection
- [ ] No console errors in browser
- [ ] Maps load and display correctly

### 3. User Flow Testing
- [ ] Can see all 9 maps with images
- [ ] Can select/deselect maps by clicking
- [ ] Visual feedback shows selected maps (border, badge)
- [ ] Can't select more than 7 maps
- [ ] Warning shows if < 3 maps selected
- [ ] Form submits successfully with maps
- [ ] Tournament created in database
- [ ] `tournament_maps` table has correct records

### 4. Validation
```sql
-- Check tournament has maps
SELECT t.name, COUNT(tm.map_id) as map_count
FROM tournaments t
LEFT JOIN tournament_maps tm ON t.id = tm.tournament_id
GROUP BY t.id, t.name;

-- View specific tournament's maps
SELECT t.name as tournament, m.name as map
FROM tournaments t
JOIN tournament_maps tm ON t.id = tm.tournament_id
JOIN maps m ON tm.map_id = m.map_id
WHERE t.id = 'YOUR_TOURNAMENT_ID';
```

---

## Common Issues

### Images not loading?
- Check bucket is public
- Verify image URLs in database match Storage URLs
- Open image URL directly in browser to test

### Can't select maps?
- Check RLS policies are applied
- Verify user is authenticated
- Check browser console for errors

### Maps not saving?
- Ensure `addMapsToTournament()` is called AFTER tournament creation
- Check `tournament_maps` table in database
- Verify foreign key constraints

---

## Performance Tips

1. **Image Optimization**: Use WebP format (50% smaller than JPG)
2. **Lazy Loading**: Maps already use eager loading (small dataset)
3. **Caching**: Supabase Storage has built-in CDN caching
4. **RLS**: Queries are optimized with indexes on foreign keys

---

## Future Enhancements

- [ ] Map categories (Land, Water, Hybrid, Closed)
- [ ] Map banning phase before matches
- [ ] Custom map upload by tournament admins
- [ ] Map statistics (win rates, pick rates)
- [ ] Random map generator from pool

---

## File Structure

```
client/src/
├── services/
│   ├── tournamentService.js  (existing)
│   └── mapService.js          (NEW)
├── components/
│   └── MapSelector.jsx        (NEW)
└── pages/
    └── CreateTournament.jsx   (UPDATED)

database/
├── schema.sql                 (existing)
├── maps_schema.sql            (NEW)
├── MAP_IMAGES_SETUP.md        (NEW - setup guide)
└── MAP_SELECTION_FEATURE.md   (NEW - this file)
```

---

## Complete!

You now have a fully functional map pool selection feature! 🎮

**Next Steps:**
1. Follow `MAP_IMAGES_SETUP.md` to upload images
2. Create the service and component files above
3. Test the complete flow
4. Move on to player registration and team formation features
