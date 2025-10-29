import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTournament } from '../services/tournamentService';
import { 
  getUncategorizedPlayers, 
  getCategorizedPlayers,
  assignPlayerCategory,
  removePlayerCategory,
  getCategoryStats
} from '../services/playerCategoryService';
import { PlayerCard } from '../components/PlayerCard';
import './PlayerCategories.css';

const TIERS = ['S-Tier', 'A-Tier', 'B-Tier', 'Misc'];

const TIER_COLORS = {
  'S-Tier': '#ef4444',
  'A-Tier': '#f59e0b',
  'B-Tier': '#3b82f6',
  'Misc': '#6b7280'
};

export default function PlayerCategories() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [uncategorized, setUncategorized] = useState([]);
  const [categorized, setCategorized] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load tournament
      const { data: tournamentData, error: tournamentError } = await getTournament(id);
      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Check if user is admin
      if (tournamentData.admin_id !== user.id) {
        throw new Error('You do not have permission to categorize players for this tournament');
      }

      // Load uncategorized players
      const { data: uncategorizedData, error: uncategorizedError } = await getUncategorizedPlayers(id);
      if (uncategorizedError) throw uncategorizedError;
      setUncategorized(uncategorizedData || []);

      // Load categorized players
      const { data: categorizedData, error: categorizedError } = await getCategorizedPlayers(id);
      if (categorizedError) throw categorizedError;

      // Group by category
      const grouped = TIERS.reduce((acc, tier) => {
        acc[tier] = categorizedData.filter(p => p.category === tier);
        return acc;
      }, {});
      setCategorized(grouped);

      // Load stats
      const { data: statsData, error: statsError } = await getCategoryStats(id);
      if (statsError) throw statsError;
      setStats(statsData);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignCategory(player, category) {
    try {
      await assignPlayerCategory(id, player.user_id, category);
      
      // Update state locally instead of reloading
      // Remove from uncategorized
      setUncategorized(prev => prev.filter(p => p.user_id !== player.user_id));
      
      // Add to categorized with the assigned category
      const categorizedPlayer = { ...player, category, assigned_at: new Date().toISOString() };
      setCategorized(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), categorizedPlayer]
      }));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        [category]: (prev[category] || 0) + 1,
        total: prev.total + 1
      }));
    } catch (err) {
      console.error('Error assigning category:', err);
      alert('Failed to assign category: ' + err.message);
    }
  }

  async function handleRemoveCategory(player) {
    try {
      await removePlayerCategory(id, player.user_id);
      
      // Update state locally instead of reloading
      const playerCategory = player.category;
      
      // Remove from categorized
      setCategorized(prev => ({
        ...prev,
        [playerCategory]: prev[playerCategory].filter(p => p.user_id !== player.user_id)
      }));
      
      // Add back to uncategorized (without category field)
      const { category, assigned_at, ...uncategorizedPlayer } = player;
      setUncategorized(prev => [...prev, uncategorizedPlayer].sort((a, b) => 
        new Date(a.registered_at) - new Date(b.registered_at)
      ));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        [playerCategory]: Math.max(0, (prev[playerCategory] || 0) - 1),
        total: Math.max(0, prev.total - 1)
      }));
    } catch (err) {
      console.error('Error removing category:', err);
      alert('Failed to remove category: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="player-categories-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="player-categories-page">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate(`/tournaments/${id}`)} className="btn-secondary">
          Back to Tournament
        </button>
      </div>
    );
  }

  return (
    <div className="player-categories-page">
      <div className="page-header">
        <div>
          <h1>Player Categorization</h1>
          <p className="tournament-name">{tournament?.name}</p>
        </div>
        <button onClick={() => navigate(`/tournaments/${id}`)} className="btn-secondary">
          Back to Tournament
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="category-stats">
          <div className="stat-card">
            <div className="stat-label">Total Categorized</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          {TIERS.map(tier => (
            <div key={tier} className="stat-card" style={{ borderTopColor: TIER_COLORS[tier] }}>
              <div className="stat-label">{tier}</div>
              <div className="stat-value">{stats[tier] || 0}</div>
            </div>
          ))}
          <div className="stat-card">
            <div className="stat-label">Uncategorized</div>
            <div className="stat-value">{uncategorized.length}</div>
          </div>
        </div>
      )}

      {/* Uncategorized Players */}
      {uncategorized.length > 0 && (
        <div className="uncategorized-section">
          <h2>Uncategorized Players ({uncategorized.length})</h2>
          <div className="players-grid">
            {uncategorized.map(player => (
              <div key={player.user_id} className="player-item">
                <PlayerCard registration={player}>
                  <div className="player-info">
                    <div className="player-avatar">
                      {player.discord_avatar_url ? (
                        <img src={player.discord_avatar_url} alt={player.discord_username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {player.discord_username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="player-details">
                      <div className="player-name">{player.discord_username}</div>
                      <div className="player-position">
                        Prefers: {player.preferred_position === 'flank' ? 'Flank' : 'Pocket'}
                      </div>
                    </div>
                  </div>
                </PlayerCard>
                <div className="category-buttons">
                  {TIERS.map(tier => (
                    <button
                      key={tier}
                      onClick={() => handleAssignCategory(player, tier)}
                      className="btn-tier"
                      style={{ backgroundColor: TIER_COLORS[tier] }}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorized Players by Tier */}
      <div className="categorized-section">
        <h2>Categorized Players</h2>
        {TIERS.map(tier => (
          <div key={tier} className="tier-section">
            <h3 style={{ color: TIER_COLORS[tier] }}>
              {tier} ({categorized[tier]?.length || 0})
            </h3>
            {categorized[tier]?.length > 0 ? (
              <div className="players-grid">
                {categorized[tier].map(player => (
                  <div key={player.user_id} className="player-item categorized">
                    <PlayerCard registration={player}>
                      <div className="player-info">
                        <div className="player-avatar">
                          {player.discord_avatar_url ? (
                            <img src={player.discord_avatar_url} alt={player.discord_username} />
                          ) : (
                            <div className="avatar-placeholder">
                              {player.discord_username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="player-details">
                          <div className="player-name">{player.discord_username}</div>
                          <div className="player-position">
                            Prefers: {player.preferred_position === 'flank' ? 'Flank' : 'Pocket'}
                          </div>
                        </div>
                      </div>
                    </PlayerCard>
                    <button
                      onClick={() => handleRemoveCategory(player)}
                      className="btn-remove"
                      title="Remove category"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-tier">No players in this tier yet</p>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {uncategorized.length === 0 && stats?.total === 0 && (
        <div className="empty-state">
          <p>No registered players to categorize yet.</p>
          <button onClick={() => navigate(`/tournaments/${id}`)} className="btn-primary">
            Back to Tournament
          </button>
        </div>
      )}
    </div>
  );
}
