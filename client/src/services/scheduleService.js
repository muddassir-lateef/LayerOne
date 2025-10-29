import { supabase } from '../lib/supabase';

/**
 * Create a schedule proposal for a match
 */
export async function createScheduleProposal(matchId, proposedTime, notes = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('schedule_proposals')
    .insert({
      match_id: matchId,
      proposed_by: user.id,
      proposed_time: proposedTime,
      response_notes: notes,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  
  return data;
}

/**
 * Get all proposals for a match
 */
export async function getMatchProposals(matchId) {
  const { data, error } = await supabase
    .from('schedule_proposals')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Get match details to find tournament_id
  const { data: match } = await supabase
    .from('matches')
    .select('tournament_id')
    .eq('id', matchId)
    .single();
  
  if (match && data && data.length > 0) {
    // Fetch user data from registrations table
    const userIds = new Set();
    data.forEach(proposal => {
      if (proposal.proposed_by) userIds.add(proposal.proposed_by);
      if (proposal.responded_by) userIds.add(proposal.responded_by);
    });

    const { data: registrations } = await supabase
      .from('registrations')
      .select('user_id, discord_username, discord_avatar_url')
      .eq('tournament_id', match.tournament_id)
      .in('user_id', Array.from(userIds));

    // Attach user data to proposals
    data.forEach(proposal => {
      const proposerReg = registrations?.find(r => r.user_id === proposal.proposed_by);
      const responderReg = registrations?.find(r => r.user_id === proposal.responded_by);
      
      proposal.proposer = proposerReg ? {
        discord_username: proposerReg.discord_username,
        discord_avatar_url: proposerReg.discord_avatar_url
      } : null;
      
      proposal.responder = responderReg ? {
        discord_username: responderReg.discord_username,
        discord_avatar_url: responderReg.discord_avatar_url
      } : null;
    });
  }
  
  return data || [];
}

/**
 * Respond to a schedule proposal
 */
export async function respondToProposal(proposalId, status, responseNotes = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('schedule_proposals')
    .update({
      status,
      responded_by: user.id,
      response_notes: responseNotes
    })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;

  console.log('Proposal updated:', data);

  // If approved, update the match scheduled_time
  if (status === 'approved') {
    console.log('Approving proposal, updating match:', data.match_id, 'with time:', data.proposed_time);
    
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .update({
        scheduled_time: data.proposed_time,
        status: 'scheduled'
      })
      .eq('id', data.match_id)
      .select();

    if (matchError) {
      console.error('Error updating match:', matchError);
      throw matchError;
    }
    
    console.log('Match updated successfully:', matchData);
  }

  return data;
}

/**
 * Admin directly sets match schedule (overrides proposals)
 */
export async function adminSetSchedule(matchId, scheduledTime) {
  const { data, error } = await supabase
    .from('matches')
    .update({
      scheduled_time: scheduledTime,
      status: 'scheduled'
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all scheduled matches across all tournaments
 * Sorted chronologically for dashboard view
 */
export async function getAllScheduledMatches(userId = null) {
  let query = supabase
    .from('matches')
    .select(`
      *,
      tournament:tournaments(id, name, status),
      team1:teams!matches_team1_id_fkey(id, name, logo_url, captain_id),
      team2:teams!matches_team2_id_fkey(id, name, logo_url, captain_id)
    `)
    .not('scheduled_time', 'is', null)
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_time', { ascending: true });

  // If userId provided, filter to matches where user is a captain
  if (userId) {
    query = query.or(`team1.captain_id.eq.${userId},team2.captain_id.eq.${userId}`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Get upcoming matches for a specific tournament
 */
export async function getTournamentUpcomingMatches(tournamentId, limit = 5) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      team1:teams!matches_team1_id_fkey(id, name, logo_url),
      team2:teams!matches_team2_id_fkey(id, name, logo_url)
    `)
    .eq('tournament_id', tournamentId)
    .not('scheduled_time', 'is', null)
    .order('scheduled_time', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get recent completed matches for a tournament
 */
export async function getTournamentRecentMatches(tournamentId, limit = 5) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      team1:teams!matches_team1_id_fkey(id, name, logo_url),
      team2:teams!matches_team2_id_fkey(id, name, logo_url),
      winner:teams!matches_winner_id_fkey(id, name, logo_url)
    `)
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Check if user is captain of either team in a match
 */
export async function isMatchCaptain(matchId, userId) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      team1:teams!matches_team1_id_fkey(captain_id),
      team2:teams!matches_team2_id_fkey(captain_id)
    `)
    .eq('id', matchId)
    .single();

  if (error) throw error;
  
  return data.team1.captain_id === userId || data.team2.captain_id === userId;
}

/**
 * Counter-propose a new time (creates new proposal and rejects old one)
 */
export async function counterPropose(originalProposalId, matchId, newProposedTime, notes = '') {
  // Reject the original proposal
  await respondToProposal(originalProposalId, 'countered', notes);
  
  // Create new proposal
  return await createScheduleProposal(matchId, newProposedTime, notes);
}
