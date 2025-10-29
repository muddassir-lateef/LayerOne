import { supabase } from '../lib/supabase';

/**
 * Draft Service
 * Handles all draft-related operations including snake pattern calculation,
 * pick validation, and category progression
 */

/**
 * Calculate which team should pick next based on snake pattern
 * Snake pattern: Round 1 (1→2→3→4), Round 2 (4→3→2→1), Round 3 (1→2→3→4)
 */
export function calculateCurrentPick(teams, currentRound, currentCategory) {
  const numTeams = teams.length;
  
  // Determine pick position within the round (0-based)
  const isEvenRound = currentRound % 2 === 0;
  
  // In even rounds, reverse the order
  const sortedTeams = isEvenRound 
    ? [...teams].sort((a, b) => b.draft_order - a.draft_order)
    : [...teams].sort((a, b) => a.draft_order - b.draft_order);
  
  return sortedTeams;
}

/**
 * Get the next team to pick in snake pattern
 */
export function getNextPickTeam(teams, pickNumber) {
  const numTeams = teams.length;
  const roundIndex = Math.floor(pickNumber / numTeams);
  const positionInRound = pickNumber % numTeams;
  
  // Determine if this is a reverse round (even rounds go backwards)
  const isReverseRound = roundIndex % 2 === 1;
  
  const sortedTeams = isReverseRound
    ? [...teams].sort((a, b) => b.draft_order - a.draft_order)
    : [...teams].sort((a, b) => a.draft_order - b.draft_order);
  
  return sortedTeams[positionInRound];
}

/**
 * Get draft session for a tournament
 */
export async function getDraftSession(tournamentId) {
  const { data, error } = await supabase
    .from('draft_sessions')
    .select('*')
    .eq('tournament_id', tournamentId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get all teams for a tournament ordered by draft_order
 */
export async function getTeams(tournamentId) {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      captain_id,
      draft_order,
      team_members(
        user_id,
        is_captain,
        category_when_drafted
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('draft_order', { ascending: true });
  
  if (error) throw error;
  return data;
}

/**
 * Get available players for current category
 */
export async function getAvailablePlayers(tournamentId, category) {
  // Use the database function we created
  const { data, error } = await supabase
    .rpc('get_available_draft_players', {
      p_tournament_id: tournamentId,
      p_category: category
    });
  
  if (error) throw error;
  return data || [];
}

/**
 * Get all draft picks for a session
 */
export async function getDraftPicks(draftSessionId) {
  const { data, error } = await supabase
    .from('draft_picks')
    .select(`
      id,
      team_id,
      user_id,
      pick_number,
      round_number,
      category,
      picked_at,
      time_taken_seconds
    `)
    .eq('draft_session_id', draftSessionId)
    .order('pick_number', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

/**
 * Make a draft pick
 */
export async function makePick(draftSessionId, teamId, userId, pickNumber, roundNumber, category) {
  const startTime = Date.now();
  
  // Insert the pick
  const { data: pick, error: pickError } = await supabase
    .from('draft_picks')
    .insert({
      draft_session_id: draftSessionId,
      team_id: teamId,
      user_id: userId,
      pick_number: pickNumber,
      round_number: roundNumber,
      category: category,
      time_taken_seconds: 0 // Will be updated if we track time
    })
    .select()
    .single();
  
  if (pickError) throw pickError;
  
  // Add to team_members
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: userId,
      is_captain: false,
      draft_round: roundNumber,
      draft_pick_number: pickNumber,
      category_when_drafted: category
    });
  
  if (memberError) throw memberError;
  
  return pick;
}

/**
 * Update draft session state
 */
export async function updateDraftSession(draftSessionId, updates) {
  const { data, error } = await supabase
    .from('draft_sessions')
    .update(updates)
    .eq('id', draftSessionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Log a draft event to the audit log
 */
export async function logDraftEvent(draftSessionId, eventType, actorId, teamId, metadata = {}) {
  const { data, error } = await supabase
    .rpc('log_draft_event', {
      p_draft_session_id: draftSessionId,
      p_event_type: eventType,
      p_actor_id: actorId,
      p_team_id: teamId,
      p_metadata: metadata
    });
  
  if (error) {
    console.error('Error logging draft event:', error);
    // Don't throw - event logging is non-critical
  }
  return data;
}

/**
 * Get draft timeline (all events chronologically)
 */
export async function getDraftTimeline(draftSessionId) {
  const { data, error } = await supabase
    .rpc('get_draft_timeline', {
      p_draft_session_id: draftSessionId
    });
  
  if (error) throw error;
  return data || [];
}

/**
 * Determine next category when current is exhausted
 */
export function getNextCategory(currentCategory) {
  const categoryOrder = ['A-Tier', 'B-Tier', 'Misc'];
  const currentIndex = categoryOrder.indexOf(currentCategory);
  
  if (currentIndex === -1 || currentIndex === categoryOrder.length - 1) {
    return null; // Draft complete
  }
  
  return categoryOrder[currentIndex + 1];
}
