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
