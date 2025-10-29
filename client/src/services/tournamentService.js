/**
 * Tournament Service
 * 
 * Handles all tournament-related API calls to Supabase.
 * Provides functions for creating, reading, updating, and deleting tournaments.
 */

import { supabase } from '../lib/supabase';

/**
 * Create a new tournament
 * @param {Object} tournamentData - Tournament information
 * @param {string} tournamentData.name - Tournament name
 * @param {string} tournamentData.description - Tournament description
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createTournament({ name, description }) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Create tournament
    const { data, error } = await supabase
      .from('tournaments')
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null,
          admin_id: user.id,
          format: 'round_robin_gf', // Fixed format for Phase 1
          team_size: 3, // Fixed team size for Phase 1
          status: 'draft',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error creating tournament:', error);
    return { data: null, error };
  }
}

/**
 * Get all tournaments for the current user (as admin)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getUserTournaments() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user tournaments:', error);
    return { data: null, error };
  }
}

/**
 * Get all public (non-draft) tournaments
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getPublicTournaments() {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching public tournaments:', error);
    return { data: null, error };
  }
}

/**
 * Get a single tournament by ID
 * @param {string} tournamentId - Tournament UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getTournament(tournamentId) {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        tournament_settings (*)
      `)
      .eq('id', tournamentId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return { data: null, error };
  }
}

/**
 * Update a tournament
 * @param {string} tournamentId - Tournament UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateTournament(tournamentId, updates) {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', tournamentId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating tournament:', error);
    return { data: null, error };
  }
}

/**
 * Delete a tournament
 * @param {string} tournamentId - Tournament UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function deleteTournament(tournamentId) {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return { data: null, error };
  }
}

/**
 * Publish a tournament for registration
 * Changes status from 'draft' to 'registration_open'
 * @param {string} tournamentId - Tournament UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function publishTournament(tournamentId) {
  return updateTournament(tournamentId, { status: 'registration_open' });
}

/**
 * Get tournament status display text
 * @param {string} status - Tournament status
 * @returns {string} Display text
 */
export function getTournamentStatusText(status) {
  const statusMap = {
    draft: 'Draft',
    registration_open: 'Registration Open',
    registration_closed: 'Registration Closed',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  
  return statusMap[status] || status;
}

/**
 * Get tournament format display text
 * @param {string} format - Tournament format
 * @returns {string} Display text
 */
export function getTournamentFormatText(format) {
  const formatMap = {
    round_robin_gf: 'Round Robin with Grand Final',
  };
  
  return formatMap[format] || format;
}
