import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMatches, getRoundRobinStandings } from '../services/bracketService';
import ScheduleMatchModal from '../components/ScheduleMatchModal';
import './BracketView.css';

function BracketView() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    fetchData();
    checkUser();
  }, [tournamentId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Fetch matches
      const matchesData = await getMatches(tournamentId);
      setMatches(matchesData);

      // Fetch standings
      const standingsData = await getRoundRobinStandings(tournamentId);
      setStandings(standingsData);

    } catch (err) {
      console.error('Error fetching bracket:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoundRobinMatches = () => {
    return matches.filter(m => m.phase === 'round_robin');
  };

  const getSemifinals = () => {
    return matches.filter(m => m.phase === 'semifinal').sort((a, b) => a.match_number - b.match_number);
  };

  const getGrandFinal = () => {
    return matches.find(m => m.phase === 'grandfinal');
  };

  const getMatchStatusBadge = (match) => {
    const statusColors = {
      pending: 'gray',
      scheduled: 'blue',
      in_progress: 'orange',
      completed: 'green',
      disputed: 'red',
      cancelled: 'gray'
    };
    return (
      <span className={`status-badge status-${statusColors[match.status]}`}>
        {match.status.replace('_', ' ')}
      </span>
    );
  };

  const getTeamLogo = (team) => {
    if (!team) return null;
    
    if (team.logo_url) {
      return (
        <div className="team-logo">
          <img src={team.logo_url} alt={team.name} />
        </div>
      );
    }
    
    return (
      <div className="team-logo team-logo-placeholder">
        {team.name?.charAt(0) || '?'}
      </div>
    );
  };

  const renderTeamInfo = (team, score = null, isWinner = false) => {
    if (!team) {
      return (
        <div className="team-info team-tbd">
          <div className="team-logo team-logo-placeholder">?</div>
          <span className="team-name">TBD</span>
        </div>
      );
    }

    return (
      <div className={`team-info ${isWinner ? 'team-winner' : ''}`}>
        {getTeamLogo(team)}
        <div className="team-details">
          <span className="team-name">{team.name}</span>
          {score !== null && <span className="team-score">{score}</span>}
        </div>
      </div>
    );
  };

  const renderRoundRobinMatch = (match) => (
    <div key={match.id} className="round-robin-match">
      <div className="match-header">
        <span className="match-number">Match #{match.match_number}</span>
        {getMatchStatusBadge(match)}
      </div>
      <div className="match-teams">
        {renderTeamInfo(match.team1, match.team1_score, match.winner_id === match.team1?.id)}
        <span className="vs-text">VS</span>
        {renderTeamInfo(match.team2, match.team2_score, match.winner_id === match.team2?.id)}
      </div>
      {match.scheduled_time ? (
        <div className="match-scheduled">
          <div className="match-time">
            📅 {new Date(match.scheduled_time).toLocaleString()}
          </div>
          {match.status === 'scheduled' && match.team1 && match.team2 && (
            <button 
              className="reschedule-button"
              onClick={() => {
                setSelectedMatch(match);
                setShowScheduleModal(true);
              }}
            >
              🔄 Reschedule
            </button>
          )}
        </div>
      ) : match.status === 'pending' && match.team1 && match.team2 && (
        <button 
          className="schedule-button"
          onClick={() => {
            setSelectedMatch(match);
            setShowScheduleModal(true);
          }}
        >
          📅 Schedule Match
        </button>
      )}
    </div>
  );

  const renderPlayoffMatch = (match, title) => (
    <div className="playoff-match">
      <h4 className="playoff-match-title">{title}</h4>
      {getMatchStatusBadge(match)}
      <div className="playoff-match-info">
        <span className="best-of">Best of {match.best_of}</span>
      </div>
      <div className="playoff-teams">
        <div className={`playoff-team ${match.winner_id === match.team1?.id ? 'winner' : ''}`}>
          {getTeamLogo(match.team1)}
          <div className="playoff-team-details">
            <span className="playoff-team-name">{match.team1?.name || 'TBD'}</span>
            <span className="playoff-team-score">{match.team1_score}</span>
          </div>
        </div>
        
        <div className="playoff-divider">
          <span className="vs-circle">VS</span>
        </div>
        
        <div className={`playoff-team ${match.winner_id === match.team2?.id ? 'winner' : ''}`}>
          {getTeamLogo(match.team2)}
          <div className="playoff-team-details">
            <span className="playoff-team-name">{match.team2?.name || 'TBD'}</span>
            <span className="playoff-team-score">{match.team2_score}</span>
          </div>
        </div>
      </div>
      {match.scheduled_time ? (
        <div className="match-scheduled">
          <div className="match-time">
            📅 {new Date(match.scheduled_time).toLocaleString()}
          </div>
          {match.status === 'scheduled' && match.team1 && match.team2 && (
            <button 
              className="reschedule-button"
              onClick={() => {
                setSelectedMatch(match);
                setShowScheduleModal(true);
              }}
            >
              🔄 Reschedule
            </button>
          )}
        </div>
      ) : match.status === 'pending' && match.team1 && match.team2 && (
        <button 
          className="schedule-button"
          onClick={() => {
            setSelectedMatch(match);
            setShowScheduleModal(true);
          }}
        >
          📅 Schedule Match
        </button>
      )}
    </div>
  );

  const renderStandingsTable = () => (
    <div className="standings-table">
      <h3>🏆 Round Robin Standings</h3>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>W</th>
            <th>L</th>
            <th>Games</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => (
            <tr key={team.id} className={index < 4 ? 'qualified' : ''}>
              <td className="rank-cell">
                {index + 1}
                {index < 4 && <span className="qualified-badge">✓</span>}
              </td>
              <td className="team-cell">
                {getTeamLogo(team)}
                <span className="team-name">{team.name}</span>
              </td>
              <td>{team.wins}</td>
              <td>{team.losses}</td>
              <td>{team.gamesWon}-{team.gamesLost}</td>
              <td className="points-cell">{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="standings-legend">
        <span className="legend-item">
          <span className="legend-icon qualified-icon">✓</span>
          Top 4 teams advance to playoffs
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bracket-view loading">
        <div className="spinner"></div>
        <p>Loading bracket...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bracket-view error">
        <h2>Error Loading Bracket</h2>
        <p>{error}</p>
        <button onClick={() => navigate(`/tournaments/${tournamentId}`)}>
          Back to Tournament
        </button>
      </div>
    );
  }

  if (!matches.length) {
    return (
      <div className="bracket-view no-matches">
        <h2>No Bracket Generated</h2>
        <p>The bracket has not been generated for this tournament yet.</p>
        <button onClick={() => navigate(`/tournaments/${tournamentId}`)}>
          Back to Tournament
        </button>
      </div>
    );
  }

  const roundRobinMatches = getRoundRobinMatches();
  const semifinals = getSemifinals();
  const grandFinal = getGrandFinal();

  return (
    <div className="bracket-view">
      <div className="bracket-header">
        <button className="back-button" onClick={() => navigate(`/tournaments/${tournamentId}`)}>
          ← Back to Tournament
        </button>
        <h1>{tournament?.name} - Bracket</h1>
      </div>

      {/* Round Robin Section */}
      <section className="bracket-section round-robin-section">
        <h2>📋 Round Robin Phase</h2>
        <p className="section-description">
          All teams play each other once. Each match is All Played 3 (AP3).
        </p>
        
        {standings.length > 0 && renderStandingsTable()}

        <div className="round-robin-matches">
          <h3>All Matches</h3>
          <div className="matches-grid">
            {roundRobinMatches.map(renderRoundRobinMatch)}
          </div>
        </div>
      </section>

      {/* Playoffs Section */}
      <section className="bracket-section playoffs-section">
        <h2>🎯 Playoffs</h2>
        <p className="section-description">
          Top 4 teams from Round Robin advance to the playoffs.
        </p>

        {/* Semifinals */}
        <div className="playoffs-round semifinals-round">
          <h3>Semifinals</h3>
          <div className="semifinals-container">
            {semifinals.map((match, index) => (
              <div key={match.id} className="semifinal-wrapper">
                {renderPlayoffMatch(
                  match,
                  index === 0 ? 'Semifinal 1 (1st vs 4th)' : 'Semifinal 2 (2nd vs 3rd)'
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grand Final */}
        {grandFinal && (
          <div className="playoffs-round grandfinal-round">
            <h3>🏆 Grand Final</h3>
            <div className="grandfinal-container">
              {renderPlayoffMatch(grandFinal, 'Grand Final - Best of 5')}
            </div>
            {grandFinal.winner_id && (
              <div className="champion-banner">
                <h2>🎉 Champion 🎉</h2>
                <div className="champion-info">
                  {getTeamLogo(grandFinal.winner)}
                  <span className="champion-name">{grandFinal.winner?.name}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Admin Controls */}
      {user && tournament?.admin_id === user.id && (
        <div className="bracket-admin-controls">
          <button 
            className="btn-secondary"
            onClick={() => navigate(`/tournaments/${tournamentId}/teams`)}
          >
            ⚙️ Manage Teams
          </button>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedMatch && (
        <ScheduleMatchModal
          match={selectedMatch}
          isAdmin={user && tournament?.admin_id === user.id}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedMatch(null);
          }}
          onScheduled={() => {
            fetchData(); // Refresh matches
          }}
        />
      )}
    </div>
  );
}

export default BracketView;
