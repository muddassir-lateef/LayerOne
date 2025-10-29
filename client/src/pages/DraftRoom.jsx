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
  const [captainRegistrations, setCaptainRegistrations] = useState({});
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

      // Load captain registrations
      const captainIds = teamsData.map(t => t.captain_id);
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .in('user_id', captainIds);

      if (regError) throw regError;
      
      // Create a map of captain_id -> registration
      const regMap = {};
      registrations.forEach(reg => {
        regMap[reg.user_id] = reg;
      });
      setCaptainRegistrations(regMap);

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
    if (session.status !== 'in_progress') {
      setCurrentTeam(null);
      setIsMyTurn(false);
      return;
    }

    const pickNumber = picks.length;
    const nextTeam = getNextPickTeam(teamsData, pickNumber);
    
    setCurrentTeam(nextTeam);
    setIsMyTurn(nextTeam?.captain_id === user?.id);
  };

  const handlePickUpdate = async (payload) => {
    console.log('Pick update:', payload);
    
    // Only reload picks and update current pick
    if (draftSession?.id) {
      const picks = await getDraftPicks(draftSession.id);
      setDraftPicks(picks);
      
      // Update available players for current category
      if (draftSession.current_category) {
        const players = await getAvailablePlayers(tournamentId, draftSession.current_category);
        setAvailablePlayers(players);
      }
      
      // Update current pick
      updateCurrentPick(draftSession, teams, picks);
    }
  };

  const handleSessionUpdate = async (payload) => {
    console.log('Session update:', payload);
    
    // Only reload session and related data
    const session = await getDraftSession(tournamentId);
    setDraftSession(session);
    
    // Update available players if category changed
    if (session.current_category) {
      const players = await getAvailablePlayers(tournamentId, session.current_category);
      setAvailablePlayers(players);
    }
    
    // Update current pick
    const picks = await getDraftPicks(session.id);
    updateCurrentPick(session, teams, picks);
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

      const pickNumber = draftPicks.length;
      const roundNumber = Math.floor(pickNumber / teams.length) + 1;

      await makePick(
        draftSession.id,
        myTeam.id,
        player.user_id,
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
      setError(err.message);
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
              
              const captainReg = captainRegistrations[team.captain_id];
              
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

          {isAdmin && draftSession.all_captains_connected && (
            <button onClick={handleStartDraft} className="btn-primary btn-large">
              Start Draft
            </button>
          )}
        </div>
      )}

      {/* Draft in progress */}
      {(draftSession?.status === 'in_progress' || draftSession?.status === 'ready') && (
        <div className="draft-content">
          {/* Current Pick Indicator */}
          <div className="current-pick-section">
            {currentTeam && (
              <div className={`current-pick ${isMyTurn ? 'my-turn' : ''}`}>
                {isMyTurn ? (
                  <h2>🎯 YOUR TURN TO PICK!</h2>
                ) : (
                  <h2>Current Pick: Team {currentTeam.draft_order} - {currentTeam.name}</h2>
                )}
                <p>Pick #{draftPicks.length + 1} - Round {Math.floor(draftPicks.length / teams.length) + 1}</p>
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
                    <div
                      key={player.user_id}
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
                  ))}
                </div>
              )}
            </div>

            {/* Teams Roster */}
            <div className="teams-panel">
              <h3>Teams</h3>
              <div className="teams-list">
                {teams.map(team => (
                  <div key={team.id} className={`team-card ${team.id === currentTeam?.id ? 'active-pick' : ''} ${team.id === myTeam?.id ? 'my-team' : ''}`}>
                    <div className="team-header">
                      <h4>Team {team.draft_order}: {team.name}</h4>
                      <span className="team-size">{team.team_members?.length || 0} players</span>
                    </div>
                    <div className="team-members-mini">
                      {team.team_members?.map(member => (
                        <div key={member.user_id} className="team-member-mini">
                          {member.is_captain && '⭐ '}
                          <span className={`category-badge-mini ${member.category_when_drafted}`}>
                            {member.category_when_drafted?.charAt(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
