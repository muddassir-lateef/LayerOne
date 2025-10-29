import { supabase } from '../lib/supabase';

/**
 * Generate Round Robin matches for all teams
 * Each team plays each other team once
 */
export async function generateRoundRobinMatches(tournamentId, teams) {
  const matches = [];
  let matchNumber = 1;

  // Generate all possible pairings (each team plays each other once)
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        tournament_id: tournamentId,
        phase: 'round_robin',
        round: null,
        match_number: matchNumber++,
        team1_id: teams[i].id,
        team2_id: teams[j].id,
        status: 'pending',
        best_of: 1, // Round Robin is AP3 (All Played 3), but we track as Bo1 for simplicity
        team1_score: 0,
        team2_score: 0
      });
    }
  }

  const { data, error } = await supabase
    .from('matches')
    .insert(matches)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Generate Playoff matches (Semifinals and Grand Final)
 * Note: Team assignments happen after round robin standings are determined
 */
export async function generatePlayoffMatches(tournamentId) {
  const matches = [];

  // Semifinal 1: 3rd vs 4th (Bo3)
  matches.push({
    tournament_id: tournamentId,
    phase: 'semifinal',
    round: 1,
    match_number: 1,
    team1_id: null, // Will be set to 3rd place team
    team2_id: null, // Will be set to 4th place team
    status: 'pending',
    best_of: 3,
    team1_score: 0,
    team2_score: 0
  });

  // Semifinal 2: 1st vs 2nd (Bo3)
  matches.push({
    tournament_id: tournamentId,
    phase: 'semifinal',
    round: 1,
    match_number: 2,
    team1_id: null, // Will be set to 1st place team
    team2_id: null, // Will be set to 2nd place team
    status: 'pending',
    best_of: 3,
    team1_score: 0,
    team2_score: 0
  });

  // Grand Final: Winner SF1 vs Winner SF2 (Bo5)
  matches.push({
    tournament_id: tournamentId,
    phase: 'grandfinal',
    round: 1,
    match_number: 1,
    team1_id: null, // Will be set to SF1 winner
    team2_id: null, // Will be set to SF2 winner
    status: 'pending',
    best_of: 5,
    team1_score: 0,
    team2_score: 0
  });

  const { data, error } = await supabase
    .from('matches')
    .insert(matches)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Generate complete bracket (Round Robin + Playoffs)
 */
export async function generateBracket(tournamentId) {
  // Get all teams for this tournament
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, draft_order')
    .eq('tournament_id', tournamentId)
    .order('draft_order', { ascending: true });

  if (teamsError) throw teamsError;

  if (teams.length < 4) {
    throw new Error('At least 4 teams are required for Round Robin with Grand Final format');
  }

  // Check if matches already exist
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .limit(1);

  if (existingMatches && existingMatches.length > 0) {
    throw new Error('Bracket already exists for this tournament');
  }

  // Generate Round Robin matches
  const roundRobinMatches = await generateRoundRobinMatches(tournamentId, teams);

  // Generate Playoff matches (teams TBD)
  const playoffMatches = await generatePlayoffMatches(tournamentId);

  return {
    roundRobin: roundRobinMatches,
    playoffs: playoffMatches,
    totalMatches: roundRobinMatches.length + playoffMatches.length
  };
}

/**
 * Get all matches for a tournament
 */
export async function getMatches(tournamentId) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      team1:teams!matches_team1_id_fkey(id, name, logo_url),
      team2:teams!matches_team2_id_fkey(id, name, logo_url),
      winner:teams!matches_winner_id_fkey(id, name)
    `)
    .eq('tournament_id', tournamentId)
    .order('phase', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Calculate Round Robin standings
 */
export async function getRoundRobinStandings(tournamentId) {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('phase', 'round_robin')
    .eq('status', 'completed');

  if (error) throw error;

  // Get all teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, logo_url, draft_order')
    .eq('tournament_id', tournamentId);

  // Calculate standings
  const standings = teams.map(team => ({
    ...team,
    wins: 0,
    losses: 0,
    gamesWon: 0,
    gamesLost: 0,
    points: 0
  }));

  matches.forEach(match => {
    const team1Stats = standings.find(s => s.id === match.team1_id);
    const team2Stats = standings.find(s => s.id === match.team2_id);

    if (team1Stats && team2Stats) {
      team1Stats.gamesWon += match.team1_score;
      team1Stats.gamesLost += match.team2_score;
      team2Stats.gamesWon += match.team2_score;
      team2Stats.gamesLost += match.team1_score;

      if (match.winner_id === team1Stats.id) {
        team1Stats.wins++;
        team1Stats.points += 3; // 3 points for a win
        team2Stats.losses++;
      } else if (match.winner_id === team2Stats.id) {
        team2Stats.wins++;
        team2Stats.points += 3;
        team1Stats.losses++;
      }
    }
  });

  // Sort by points (desc), then wins (desc), then games won (desc)
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.gamesWon - a.gamesWon;
  });

  return standings;
}

/**
 * Assign playoff teams based on round robin standings
 */
export async function assignPlayoffTeams(tournamentId) {
  const standings = await getRoundRobinStandings(tournamentId);

  if (standings.length < 4) {
    throw new Error('At least 4 teams required for playoffs');
  }

  const top4 = standings.slice(0, 4);

  // Update Semifinal 1: 1st vs 4th
  const { error: sf1Error } = await supabase
    .from('matches')
    .update({
      team1_id: top4[0].id, // 1st place
      team2_id: top4[3].id  // 4th place
    })
    .eq('tournament_id', tournamentId)
    .eq('phase', 'semifinal')
    .eq('match_number', 1);

  if (sf1Error) throw sf1Error;

  // Update Semifinal 2: 2nd vs 3rd
  const { error: sf2Error } = await supabase
    .from('matches')
    .update({
      team1_id: top4[1].id, // 2nd place
      team2_id: top4[2].id  // 3rd place
    })
    .eq('tournament_id', tournamentId)
    .eq('phase', 'semifinal')
    .eq('match_number', 2);

  if (sf2Error) throw sf2Error;

  return top4;
}

/**
 * Update match result
 */
export async function updateMatchResult(matchId, team1Score, team2Score, winnerId) {
  const { data, error } = await supabase
    .from('matches')
    .update({
      team1_score: team1Score,
      team2_score: team2Score,
      winner_id: winnerId,
      status: 'completed'
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;

  // Check if this is a semifinal - if so, update grand final
  if (data.phase === 'semifinal') {
    await updateGrandFinalTeams(data.tournament_id);
  }

  return data;
}

/**
 * Update grand final teams after semifinals complete
 */
async function updateGrandFinalTeams(tournamentId) {
  // Get semifinal results
  const { data: semifinals } = await supabase
    .from('matches')
    .select('match_number, winner_id')
    .eq('tournament_id', tournamentId)
    .eq('phase', 'semifinal')
    .eq('status', 'completed');

  if (!semifinals || semifinals.length !== 2) {
    return; // Not all semifinals complete yet
  }

  const sf1Winner = semifinals.find(m => m.match_number === 1)?.winner_id;
  const sf2Winner = semifinals.find(m => m.match_number === 2)?.winner_id;

  if (sf1Winner && sf2Winner) {
    await supabase
      .from('matches')
      .update({
        team1_id: sf1Winner,
        team2_id: sf2Winner
      })
      .eq('tournament_id', tournamentId)
      .eq('phase', 'grandfinal');
  }
}

/**
 * Delete all matches for a tournament (for regenerating bracket)
 */
export async function deleteBracket(tournamentId) {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('tournament_id', tournamentId);

  if (error) throw error;
}
