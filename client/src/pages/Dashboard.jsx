/**
 * Dashboard Page
 * 
 * Main landing page after login.
 * Shows user's tournaments and option to create new tournament.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserTournaments, getPublicTournaments, getTournamentStatusText } from '../services/tournamentService';
import { getAllScheduledMatches } from '../services/scheduleService';
import './Dashboard.css';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myTournaments, setMyTournaments] = useState([]);
  const [publicTournaments, setPublicTournaments] = useState([]);
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tournaments on mount
  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    setError(null);
    
    // Load user's own tournaments
    const { data: myData, error: myError } = await getUserTournaments();
    if (myError) {
      setError('Failed to load tournaments');
      console.error(myError);
    } else {
      setMyTournaments(myData || []);
    }

    // Load public tournaments (open for registration)
    const { data: publicData, error: publicError } = await getPublicTournaments();
    if (publicError) {
      console.error(publicError);
    } else {
      // Filter to only show tournaments user doesn't own
      const filtered = (publicData || []).filter(t => 
        t.admin_id !== user?.id
      );
      setPublicTournaments(filtered);
    }

    // Load scheduled matches
    try {
      const matches = await getAllScheduledMatches();
      setScheduledMatches(matches || []);
    } catch (err) {
      console.error('Error loading scheduled matches:', err);
    }
    
    setLoading(false);
  };

  const handleCreateTournament = () => {
    navigate('/tournaments/create');
  };

  const handleTournamentClick = (tournamentId) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const getStatusBadgeClass = (status) => {
    const classMap = {
      draft: 'status-draft',
      registration_open: 'status-open',
      registration_closed: 'status-closed',
      categorizing: 'status-categorizing',
      awaiting_captain_ranking: 'status-ranking',
      draft_ready: 'status-draft-ready',
      draft_in_progress: 'status-draft-progress',
      teams_finalized: 'status-finalized',
      in_progress: 'status-progress',
      completed: 'status-completed',
    };
    return classMap[status] || 'status-default';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <p>Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">
              Manage and join AoE2 tournaments
            </p>
          </div>
          <button 
            onClick={handleCreateTournament}
            className="btn-create-tournament"
          >
            <svg className="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Tournament
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
            <button onClick={loadTournaments} className="btn-retry">
              Retry
            </button>
          </div>
        )}

        {/* Scheduled Matches Section */}
        {scheduledMatches.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              color: '#111827'
            }}>
              📅 Upcoming Scheduled Matches
            </h2>
            <div className="scheduled-matches-list">
              {scheduledMatches.map((match) => (
                <div
                  key={match.id}
                  className="scheduled-match-card"
                  onClick={() => navigate(`/tournaments/${match.tournament.id}/bracket`)}
                >
                  <div className="scheduled-match-time">
                    <div className="time-icon">📅</div>
                    <div className="time-details">
                      <div className="time-date">
                        {new Date(match.scheduled_time).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="time-hour">
                        {new Date(match.scheduled_time).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="scheduled-match-info">
                    <div className="match-tournament">{match.tournament.name}</div>
                    <div className="match-teams">
                      <div className="match-team">
                        {match.team1?.logo_url && (
                          <img src={match.team1.logo_url} alt="" className="team-logo-tiny" />
                        )}
                        <span>{match.team1?.name || 'TBD'}</span>
                      </div>
                      <span className="match-vs">vs</span>
                      <div className="match-team">
                        {match.team2?.logo_url && (
                          <img src={match.team2.logo_url} alt="" className="team-logo-tiny" />
                        )}
                        <span>{match.team2?.name || 'TBD'}</span>
                      </div>
                    </div>
                    <div className="match-format">
                      {match.phase.replace('_', ' ')} • Bo{match.best_of}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Tournaments Section */}
        {publicTournaments.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              marginBottom: '1rem',
              color: '#111827'
            }}>
              Public Tournaments
            </h2>
            <div className="tournaments-grid">
              {publicTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="tournament-card"
                  onClick={() => handleTournamentClick(tournament.id)}
                >
                  <div className="tournament-card-header">
                    <h3 className="tournament-name">{tournament.name}</h3>
                    <span className={`status-badge ${getStatusBadgeClass(tournament.status)}`}>
                      {getTournamentStatusText(tournament.status)}
                    </span>
                  </div>
                  
                  <p className="tournament-description">
                    {tournament.description || 'No description'}
                  </p>
                  
                  <div className="tournament-meta">
                    <div className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>3v3</span>
                    </div>
                    
                    <div className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(tournament.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Tournaments Section */}
        <div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '600', 
            marginBottom: '1rem',
            color: '#111827'
          }}>
            My Tournaments
          </h2>
          
          {myTournaments.length === 0 ? (
            <div className="empty-state">
              <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2>No tournaments yet</h2>
              <p>Create your first tournament to get started</p>
              <button 
                onClick={handleCreateTournament}
                className="btn-create-first"
              >
                Create Your First Tournament
              </button>
            </div>
          ) : (
            <div className="tournaments-grid">
              {myTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="tournament-card"
                  onClick={() => handleTournamentClick(tournament.id)}
                >
                  <div className="tournament-card-header">
                    <h3 className="tournament-name">{tournament.name}</h3>
                    <span className={`status-badge ${getStatusBadgeClass(tournament.status)}`}>
                      {getTournamentStatusText(tournament.status)}
                    </span>
                  </div>
                  
                  <p className="tournament-description">
                    {tournament.description || 'No description'}
                  </p>
                  
                  <div className="tournament-meta">
                    <div className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>3v3</span>
                    </div>
                    
                    <div className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(tournament.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
