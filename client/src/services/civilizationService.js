/**
 * Civilization Service
 * 
 * Handles fetching civilization data from the database.
 */

import { supabase } from '../lib/supabase';

/**
 * Get all active civilizations
 * @returns {Promise<Array>}
 */
export async function getActiveCivilizations() {
  try {
    const { data, error } = await supabase
      .from('civilizations')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching civilizations:', error);
    return [];
  }
}
