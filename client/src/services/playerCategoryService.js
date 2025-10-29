import { supabase } from '../lib/supabase';

/**
 * Assign a category to a player
 */
export async function assignPlayerCategory(tournamentId, userId, category) {
  const { data, error } = await supabase
    .from('player_categories')
    .upsert({
      tournament_id: tournamentId,
      user_id: userId,
      category: category,
      assigned_by: (await supabase.auth.getUser()).data.user.id
    }, {
      onConflict: 'tournament_id,user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return { data, error: null };
}

/**
 * Remove category assignment from a player
 */
export async function removePlayerCategory(tournamentId, userId) {
  const { error } = await supabase
    .from('player_categories')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId);

  if (error) throw error;
  return { error: null };
}

/**
 * Get all uncategorized players for a tournament
 */
export async function getUncategorizedPlayers(tournamentId) {
  const { data, error } = await supabase
    .rpc('get_uncategorized_players', {
      tournament_uuid: tournamentId
    });

  if (error) throw error;
  return { data, error: null };
}

/**
 * Get all categorized players grouped by tier
 */
export async function getCategorizedPlayers(tournamentId) {
  const { data, error } = await supabase
    .rpc('get_categorized_players', {
      tournament_uuid: tournamentId
    });

  if (error) throw error;
  return { data, error: null };
}

/**
 * Get player category for a specific user in a tournament
 */
export async function getPlayerCategory(tournamentId, userId) {
  const { data, error } = await supabase
    .from('player_categories')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
  return { data, error: null };
}

/**
 * Get category statistics for a tournament
 */
export async function getCategoryStats(tournamentId) {
  const { data, error } = await supabase
    .from('player_categories')
    .select('category')
    .eq('tournament_id', tournamentId);

  if (error) throw error;

  const stats = {
    'S-Tier': 0,
    'A-Tier': 0,
    'B-Tier': 0,
    'Misc': 0,
    total: 0
  };

  data.forEach(item => {
    stats[item.category] = (stats[item.category] || 0) + 1;
    stats.total++;
  });

  return { data: stats, error: null };
}
