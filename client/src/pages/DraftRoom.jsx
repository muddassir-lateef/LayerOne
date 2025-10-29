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
  getNextCategory
} from '../services/draftService';
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
  const [currentTeam, setCurrentTeam] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    loadDraftData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`draft:${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'draft_picks',
        filter: `draft_session_id=eq.${draftSession?.id}`
      }, handlePickUpdate)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'draft_sessions',
        filter: `tournament_id=eq.${tournamentId}`
      }, handleSessionUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

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
      const session = await getDraftSession(tournamentId);
      setDraftSession(session);

      // Load teams
      const teamsData = await getTeams(tournamentId);
      setTeams(teamsData);

      // Find my team (if I'm a captain)
      const myTeamData = teamsData.find(t => t.captain_id === user?.id);
      setMyTeam(myTeamData);

      // Load available players for current category
      if (session.current_category) {
        const players = await getAvailablePlayers(tournamentId, session.current_category);
        setAvailablePlayers(players);
      }

      // Load draft picks
      const picks = await getDraftPicks(session.id);
      setDraftPicks(picks);

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

  const handlePickUpdate = (payload) => {
    console.log('Pick update:', payload);
    loadDraftData(); // Reload all data
  };

  const handleSessionUpdate = (payload) => {
    console.log('Session update:', payload);
    loadDraftData(); // Reload all data
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
          <h1>Draft Room</h1>
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

      {/* Waiting for captains */}
      {draftSession?.status === 'waiting_for_captains' && (
        <div className="waiting-section">
          <h3>Waiting for all captains to connect...</h3>
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
                      className={`player-card ${isMyTurn ? 'pickable' : ''}`}
                      onClick={() => isMyTurn && handlePlayerPick(player)}
                      style={{ cursor: isMyTurn ? 'pointer' : 'default' }}
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
