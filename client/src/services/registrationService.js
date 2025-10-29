/**
 * Registration Service
 * 
 * Handles player registration for tournaments.
 */

import { supabase } from '../lib/supabase';

/**
 * Register for a tournament
 * @param {Object} registrationData - Registration information
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function registerForTournament(registrationData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Get Discord username and avatar from user metadata
    const discordUsername = user.user_metadata?.full_name || user.email;
    const discordAvatarUrl = user.user_metadata?.avatar_url || null;

    const { data, error } = await supabase
      .from('registrations')
      .insert([
        {
          tournament_id: registrationData.tournamentId,
          user_id: user.id,
          aoe2insights_url: registrationData.aoe2insightsUrl.trim(),
          discord_username: discordUsername,
          discord_avatar_url: discordAvatarUrl,
          preferred_civs_flank: registrationData.preferredCivsFlank || [],
          preferred_civs_pocket: registrationData.preferredCivsPocket || [],
          preferred_position: registrationData.preferredPosition,
          preferred_maps: registrationData.preferredMaps || [],
          notes: registrationData.notes?.trim() || null,
          status: 'approved', // Auto-approve for now
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error registering for tournament:', error);
    return { data: null, error };
  }
}

/**
 * Get all registrations for a tournament
 * @param {string} tournamentId - Tournament UUID
 * @returns {Promise<Array>}
 */
export async function getTournamentRegistrations(tournamentId) {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'approved')
      .order('registered_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching tournament registrations:', error);
    return [];
  }
}

/**
 * Check if user is registered for a tournament
 * @param {string} tournamentId - Tournament UUID
 * @returns {Promise<Object|null>}
 */
export async function getUserRegistration(tournamentId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error checking user registration:', error);
    return null;
  }
}

/**
 * Update a registration
 * @param {string} registrationId - Registration UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateRegistration(registrationId, updates) {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .update(updates)
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating registration:', error);
    return { data: null, error };
  }
}

/**
 * Withdraw from a tournament (delete registration)
 * @param {string} registrationId - Registration UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function withdrawRegistration(registrationId) {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error withdrawing registration:', error);
    return { data: null, error };
  }
}

/**
 * Get registration count for a tournament
 * @param {string} tournamentId - Tournament UUID
 * @returns {Promise<number>}
 */
export async function getRegistrationCount(tournamentId) {
  try {
    const { count, error } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('status', 'approved');

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting registration count:', error);
    return 0;
  }
}
