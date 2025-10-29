import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getDraftSession,
  getTeams,
  getAvailablePlayers,
  getDraftPicks,
  makePick,
  updateDraftSession,
  getNextPickTeam,
  getNextCategory,
  logDraftEvent
} from '../services/draftService';
import { PlayerCard } from '../components/PlayerCard';
import './DraftRoom.css';

const DraftRoom = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [draftSession, setDraftSession] = useState(null);
  const [teams, setTeams] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [draftPicks, setDraftPicks] = useState([]);
  const [captainPresence, setCaptainPresence] = useState([]);
  const [playerRegistrations, setPlayerRegistrations] = useState({});
  const [realtimeChannel, setRealtimeChannel] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [error, setError] = useState(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    loadDraftData();
  }, [tournamentId]);

  // Update current pick whenever draft session, teams, or picks change
  useEffect(() => {
    if (draftSession && teams.length > 0) {
      updateCurrentPick(draftSession, teams, draftPicks);
    }
  }, [draftSession?.status, draftSession?.current_category, teams, draftPicks, user?.id]);

  // Set up Realtime channel after draft session is loaded
  useEffect(() => {
    if (!draftSession || !user) return;
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`draft:${tournamentId}`, {
        config: {
          presence: {
            key: user.id, // Use user ID as presence key
          },
        },
      })
      // Listen to presence sync (when presence state changes)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('Presence sync:', presenceState);
        
        // Convert presence state to array format
        const presenceArray = Object.keys(presenceState).map(key => ({
          captain_id: key,
          is_online: true,
          user_data: presenceState[key][0], // Get first presence object
        }));
        setCaptainPresence(presenceArray);
      })
      // Listen to presence join
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Captain joined:', key, newPresences);
      })
      // Listen to presence leave
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Captain left:', key, leftPresences);
      })
      // Listen to postgres changes for draft picks
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'draft_picks',
        filter: `draft_session_id=eq.${draftSession.id}`
      }, handlePickUpdate)
      // Listen to postgres changes for draft sessions
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'draft_sessions',
        filter: `tournament_id=eq.${tournamentId}`
      }, handleSessionUpdate)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime channel subscribed');
          setRealtimeChannel(channel);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [draftSession?.id, tournamentId, user?.id]);

  // Track captain presence when they're a captain
  useEffect(() => {
    if (!isCaptain || !realtimeChannel || !user || !draftSession) return;

    const trackPresence = async () => {
      try {
        console.log('Tracking captain presence...');
        await realtimeChannel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          team: myTeam?.draft_order,
        });
        console.log('Captain presence tracked');
        
        // Log captain connection event (non-blocking)
        if (draftSession?.id && myTeam?.id) {
          logDraftEvent(
            draftSession.id,
            'captain_connected',
            user.id,
            myTeam.id,
            { team_order: myTeam.draft_order }
          ).catch(err => console.error('Event log failed:', err));
        }
      } catch (err) {
        console.error('Error tracking presence:', err);
      }
    };

    trackPresence();

    // Cleanup: untrack when leaving
    return () => {
      if (realtimeChannel) {
        console.log('Untracking captain presence...');
        
        // Log disconnection event (non-blocking)
        if (draftSession?.id && myTeam?.id) {
          logDraftEvent(
            draftSession.id,
            'captain_disconnected',
            user.id,
            myTeam.id,
            { team_order: myTeam.draft_order }
          ).catch(err => console.error('Event log failed:', err));
        }
        
        realtimeChannel.untrack().catch(err => {
          console.error('Error untracking presence:', err);
        });
      }
    };
  }, [isCaptain, realtimeChannel, user, draftSession, myTeam]);

  const loadDraftData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);
      setIsAdmin(tournamentData.admin_id === user?.id);

      // Load draft session
      let session;
      try {
        console.log('Loading draft session for tournament:', tournamentId);
        session = await getDraftSession(tournamentId);
        console.log('Draft session loaded:', session);
        setDraftSession(session);
      } catch (sessionError) {
        console.error('Draft session error details:', sessionError);
        // If no draft session exists, show a helpful message
        if (sessionError.code === 'PGRST116' || sessionError.message.includes('No draft session found')) {
          throw new Error('No draft session found. Please go back to Captain Ranking and click "Start Tournament" first.');
        }
        throw sessionError;
      }

      // Load teams
      const teamsData = await getTeams(tournamentId);
      setTeams(teamsData);

      // Find my team (if I'm a captain)
      const myTeamData = teamsData.find(t => t.captain_id === user?.id);
      setMyTeam(myTeamData);
      setIsCaptain(!!myTeamData);
      
      // Check if user is a spectator (not admin, not captain)
      setIsSpectator(tournamentData.admin_id !== user?.id && !myTeamData);

      // Load available players for current category
      if (session.current_category) {
        const players = await getAvailablePlayers(tournamentId, session.current_category);
        setAvailablePlayers(players);
      }

      // Load draft picks
      const picks = await getDraftPicks(session.id);
      setDraftPicks(picks);

      // Load ALL player registrations (not just captains)
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (regError) throw regError;
      
      // Create a map of user_id -> registration
      const regMap = {};
      registrations.forEach(reg => {
        regMap[reg.user_id] = reg;
      });
      setPlayerRegistrations(regMap);

      // Calculate current pick
      updateCurrentPick(session, teamsData, picks);

    } catch (err) {
      console.error('Error loading draft data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentPick = (session, teamsData, picks) => {
    console.log('Updating current pick...', {
      sessionStatus: session.status,
      picksCount: picks.length,
      userId: user?.id
    });

    if (session.status !== 'in_progress') {
      setCurrentTeam(null);
      setIsMyTurn(false);
      return;
    }

    const pickNumber = picks.length;
    const nextTeam = getNextPickTeam(teamsData, pickNumber);
    
    console.log('Next team to pick:', nextTeam);
    console.log('Is my turn?', nextTeam?.captain_id === user?.id);
    
    setCurrentTeam(nextTeam);
    setIsMyTurn(nextTeam?.captain_id === user?.id);
  };

  const handlePickUpdate = async (payload) => {
    console.log('Pick update:', payload);
    
    // Reload the session first to get updated category
    const session = await getDraftSession(tournamentId);
    if (!session) return;
    
    setDraftSession(session);
    
    // Reload teams to get latest data
    const teamsData = await getTeams(tournamentId);
    setTeams(teamsData);
    
    // Reload picks
    const picks = await getDraftPicks(session.id);
    setDraftPicks(picks);
    
    // Update available players for the UPDATED category from session
    if (session.current_category) {
      console.log('Loading available players for category:', session.current_category);
      const players = await getAvailablePlayers(tournamentId, session.current_category);
      console.log('Available players loaded:', players.length);
      setAvailablePlayers(players);
    }
    
    // Update current pick with fresh teams data
    updateCurrentPick(session, teamsData, picks);
  };

  const handleSessionUpdate = async (payload) => {
    console.log('Session update:', payload);
    
    // Only reload session and related data
    const session = await getDraftSession(tournamentId);
    if (!session) return;
    
    setDraftSession(session);
    
    // Reload teams to ensure we have latest data
    const teamsData = await getTeams(tournamentId);
    setTeams(teamsData);
    
    // Update available players if category changed
    if (session.current_category) {
      const players = await getAvailablePlayers(tournamentId, session.current_category);
      setAvailablePlayers(players);
    }
    
    // Update current pick with fresh teams data
    const picks = await getDraftPicks(session.id);
    setDraftPicks(picks);
    updateCurrentPick(session, teamsData, picks);
    
    // Update my team reference
    const myTeamData = teamsData.find(t => t.captain_id === user?.id);
    setMyTeam(myTeamData);
  };

  const handlePresenceUpdate = async (payload) => {
    console.log('Presence update:', payload);
    // Only reload captain presence
    if (draftSession?.id) {
      const presence = await getCaptainPresence(draftSession.id);
      setCaptainPresence(presence);
    }
  };

  const handlePlayerPick = async (player) => {
    if (!isMyTurn || picking) return;

    try {
      setPicking(true);
      setError(null);

      console.log('Picking player:', player);
      console.log('Current team:', myTeam);
      console.log('Draft session:', draftSession);

      const pickNumber = draftPicks.length;
      const roundNumber = Math.floor(pickNumber / teams.length) + 1;

      // The player object from get_available_draft_players has user_id field
      await makePick(
        draftSession.id,
        myTeam.id,
        player.user_id, // This should be the correct user ID from registrations
        pickNumber,
        roundNumber,
        draftSession.current_category
      );

      // Check if category is exhausted
      const remainingPlayers = availablePlayers.filter(p => p.user_id !== player.user_id);
      
      if (remainingPlayers.length === 0) {
        // Move to next category
        const nextCategory = getNextCategory(draftSession.current_category);
        
        if (nextCategory) {
          await updateDraftSession(draftSession.id, {
            current_category: nextCategory,
            current_round: 1
          });
        } else {
          // Draft complete
          await updateDraftSession(draftSession.id, {
            status: 'completed',
            completed_at: new Date().toISOString()
          });
          
          // Update tournament status
          await supabase
            .from('tournaments')
            .update({ status: 'teams_finalized' })
            .eq('id', tournamentId);
        }
      }

      // Reload data
      await loadDraftData();

    } catch (err) {
      console.error('Error making pick:', err);
      console.error('Error details:', err.details, err.hint, err.message);
      setError(err.message || 'Failed to make pick');
    } finally {
      setPicking(false);
    }
  };

  const handleStartDraft = async () => {
    if (!isAdmin) return;

    try {
      await updateDraftSession(draftSession.id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });

      await supabase
        .from('tournaments')
        .update({ status: 'draft_in_progress' })
        .eq('id', tournamentId);

      loadDraftData();
    } catch (err) {
      console.error('Error starting draft:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="draft-room-container">
        <div className="loading">Loading draft room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="draft-room-container">
        <div className="error">Error: {error}</div>
        <button onClick={loadDraftData} className="btn-secondary">Retry</button>
      </div>
    );
  }

  return (
    <div className="draft-room-container">
      {/* Header */}
      <div className="draft-room-header">
        <div>
          <h1>Draft Room {isSpectator && <span className="spectator-badge">Spectator Mode</span>}</h1>
          <p className="draft-status">
            Status: <span className={`status-${draftSession?.status}`}>{draftSession?.status}</span>
            {draftSession?.current_category && (
              <> | Category: <span className="current-category">{draftSession.current_category}</span></>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate(`/tournaments/${tournamentId}`)}
          className="btn-secondary"
        >
          Back to Tournament
        </button>
      </div>

      {/* Spectator Notice */}
      {isSpectator && draftSession?.status !== 'completed' && (
        <div className="spectator-notice">
          👁️ You are viewing this draft as a spectator. Only captains and admins can make picks.
        </div>
      )}

      {/* Waiting for captains */}
      {draftSession?.status === 'waiting_for_captains' && (
        <div className="waiting-section">
          <h3>Waiting for all captains to connect...</h3>
          
          {/* Captain Presence Indicators */}
          <div className="captain-presence-grid">
            {teams.map(team => {
              const presence = captainPresence.find(p => p.captain_id === team.captain_id);
              const isOnline = presence?.is_online || false;
              
              const captainReg = playerRegistrations[team.captain_id];
              
              return (
                <PlayerCard key={team.id} registration={captainReg}>
                  <div className={`captain-presence-card ${isOnline ? 'online' : 'offline'}`}>
                    <div className="captain-presence-avatar-wrapper">
                      {captainReg?.discord_avatar_url ? (
                        <img
                          src={captainReg.discord_avatar_url}
                          alt={captainReg.discord_username}
                          className="captain-presence-avatar"
                        />
                      ) : (
                        <div className="captain-presence-avatar captain-avatar-placeholder">
                          {captainReg?.discord_username?.charAt(0).toUpperCase() || 'C'}
                        </div>
                      )}
                      <div className={`presence-indicator ${isOnline ? 'online' : 'offline'}`}>
                        {isOnline ? '●' : '○'}
                      </div>
                    </div>
                    <div className="captain-presence-info">
                      <div className="captain-presence-name">
                        {captainReg?.discord_username || `Captain ${team.draft_order}`}
                      </div>
                      <div className="captain-presence-team">Team {team.draft_order}</div>
                      {captainReg?.category && (
                        <div className={`captain-category-badge ${captainReg.category.toLowerCase().replace('-', '')}`}>
                          {captainReg.category}
                        </div>
                      )}
                      <div className={`captain-presence-status ${isOnline ? 'online' : 'offline'}`}>
                        {isOnline ? '✓ Connected' : 'Waiting...'}
                      </div>
                    </div>
                  </div>
                </PlayerCard>
              );
            })}
          </div>

          <div className="connection-summary">
            {captainPresence.filter(p => p.is_online).length} / {teams.length} captains connected
          </div>

          {/* Show Start Draft button when admin and all captains connected via Presence */}
          {isAdmin && captainPresence.filter(p => p.is_online).length === teams.length && teams.length > 0 && (
            <button onClick={handleStartDraft} className="btn-primary btn-large">
              Start Draft
            </button>
          )}
        </div>
      )}

      {/* Draft in progress */}
      {(draftSession?.status === 'in_progress' || draftSession?.status === 'ready') && (
        <div className="draft-content">
          {/* Current Pick Indicator with Captain Cards */}
          <div className="current-pick-section">
            {/* Captain Status Cards */}
            <div className="draft-captains-status">
              {teams.map(team => {
                const presence = captainPresence.find(p => p.captain_id === team.captain_id);
                const isOnline = presence?.is_online || false;
                const captainReg = playerRegistrations[team.captain_id];
                const isCurrentPick = currentTeam?.id === team.id;
                
                return (
                  <div 
                    key={team.id} 
                    className={`captain-status-card ${isCurrentPick ? 'current-turn' : ''} ${isOnline ? 'online' : 'offline'}`}
                  >
                    <div className="captain-status-avatar">
                      {captainReg?.discord_avatar_url ? (
                        <img
                          src={captainReg.discord_avatar_url}
                          alt={captainReg.discord_username}
                          className="captain-avatar-img"
                        />
                      ) : (
                        <div className="captain-avatar-placeholder">
                          {captainReg?.discord_username?.charAt(0).toUpperCase() || team.draft_order}
                        </div>
                      )}
                      <div className={`presence-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>
                    <div className="captain-status-info">
                      <div className="captain-status-name">
                        {captainReg?.discord_username || `Captain ${team.draft_order}`}
                      </div>
                      <div className="captain-status-team">Team {team.draft_order}</div>
                      {isCurrentPick && <div className="current-pick-indicator">🎯 PICKING</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Pick Banner */}
            {currentTeam && (
              <div className={`current-pick ${isMyTurn ? 'my-turn' : ''}`}>
                {isMyTurn ? (
                  <h2>🎯 YOUR TURN TO PICK!</h2>
                ) : (
                  <h2>Waiting for {playerRegistrations[currentTeam.captain_id]?.discord_username || `Team ${currentTeam.draft_order}`}</h2>
                )}
                <p>Pick #{draftPicks.length + 1} - Round {Math.floor(draftPicks.length / teams.length) + 1} - {draftSession.current_category}</p>
              </div>
            )}
          </div>

          {/* Main Draft Area */}
          <div className="draft-main">
            {/* Available Players */}
            <div className="available-players-panel">
              <h3>Available Players - {draftSession.current_category}</h3>
              {availablePlayers.length === 0 ? (
                <div className="no-players">
                  No players available in this category. Moving to next...
                </div>
              ) : (
                <div className="players-grid">
                  {availablePlayers.map(player => (
                    <PlayerCard key={player.user_id} registration={player}>
                      <div
                        className={`player-card ${isMyTurn && !isSpectator ? 'pickable' : ''}`}
                        onClick={() => isMyTurn && !isSpectator && handlePlayerPick(player)}
                        style={{ cursor: isMyTurn && !isSpectator ? 'pointer' : 'default' }}
                      >
                        <img
                          src={player.discord_avatar_url || `https://i.pravatar.cc/150?u=${player.user_id}`}
                          alt={player.discord_username}
                          className="player-avatar"
                        />
                        <div className="player-info">
                          <div className="player-name">{player.discord_username}</div>
                          <div className="player-position">{player.preferred_position}</div>
                          <div className="player-category-badge">{player.category}</div>
                        </div>
                      </div>
                    </PlayerCard>
                  ))}
                </div>
              )}
            </div>

            {/* Teams Roster */}
            <div className="teams-panel">
              <h3>Team Rosters</h3>
              <div className="teams-list">
                {teams.map(team => {
                  const teamPicks = draftPicks.filter(p => p.team_id === team.id);
                  const captainReg = playerRegistrations[team.captain_id];
                  
                  return (
                    <div key={team.id} className={`team-roster-card ${team.id === currentTeam?.id ? 'active-pick' : ''} ${team.id === myTeam?.id ? 'my-team' : ''}`}>
                      <div className="team-roster-header">
                        <div className="team-roster-title">
                          <h4>{team.name}</h4>
                          <span className="team-order-badge">#{team.draft_order}</span>
                        </div>
                        <span className="team-member-count">{teamPicks.length + 1} players</span>
                      </div>
                      
                      {/* Captain */}
                      <div className="team-captain-section">
                        <div className="team-member-mini-card captain">
                          {captainReg?.discord_avatar_url ? (
                            <img src={captainReg.discord_avatar_url} alt={captainReg.discord_username} className="mini-avatar" />
                          ) : (
                            <div className="mini-avatar-placeholder">{captainReg?.discord_username?.charAt(0) || 'C'}</div>
                          )}
                          <div className="mini-card-info">
                            <div className="mini-card-name">⭐ {captainReg?.discord_username || 'Captain'}</div>
                            <div className="mini-card-category s-tier">S-Tier</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Drafted Players */}
                      <div className="team-drafted-players">
                        {teamPicks.length === 0 ? (
                          <div className="no-picks-yet">No picks yet</div>
                        ) : (
                          teamPicks.map((pick) => {
                            // Direct lookup from playerRegistrations map
                            const playerReg = playerRegistrations[pick.user_id];
                            
                            return (
                              <PlayerCard key={pick.id} registration={playerReg ? { ...playerReg, category: pick.category, team_name: team.name } : null}>
                                <div className="team-member-mini-card" title={`Pick #${pick.pick_number + 1} - Round ${pick.round_number}`}>
                                  {playerReg?.discord_avatar_url ? (
                                    <img src={playerReg.discord_avatar_url} alt={playerReg.discord_username} className="mini-avatar" />
                                  ) : (
                                    <div className="mini-avatar-placeholder">?</div>
                                  )}
                                  <div className="mini-card-info">
                                    <div className="mini-card-name">{playerReg?.discord_username || 'Player'}</div>
                                    <div className={`mini-card-category ${pick.category.toLowerCase().replace('-', '')}`}>
                                      {pick.category}
                                    </div>
                                  </div>
                                  <div className="pick-number-badge">#{pick.pick_number + 1}</div>
                                </div>
                              </PlayerCard>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Draft History */}
          <div className="draft-history-section">
            <h3>Recent Picks</h3>
            <div className="draft-history">
              {draftPicks.slice(-10).reverse().map((pick, index) => {
                const team = teams.find(t => t.id === pick.team_id);
                return (
                  <div key={pick.id} className="pick-item">
                    <span className="pick-number">#{pick.pick_number + 1}</span>
                    <span className="pick-team">Team {team?.draft_order}</span>
                    <span className="pick-category">{pick.category}</span>
                    <span className="pick-time">{new Date(pick.picked_at).toLocaleTimeString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Draft Completed */}
      {draftSession?.status === 'completed' && (
        <div className="draft-completed">
          <h2>🎉 Draft Complete!</h2>
          <p>All teams have been finalized.</p>
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className="btn-primary btn-large"
          >
            View Tournament
          </button>
        </div>
      )}

      {picking && (
        <div className="picking-overlay">
          <div className="picking-spinner">Making pick...</div>
        </div>
      )}
    </div>
  );
};

export default DraftRoom;
