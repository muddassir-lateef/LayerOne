/**
 * Tournament Detail Page
 * 
 * Displays complete tournament information including:
 * - Tournament details (name, description, format)
 * - Selected map pool
 * - Status (draft, registration_open, etc.)
 * - Admin actions (publish, manage)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTournament, updateTournament } from '../services/tournamentService';
import { getTournamentMaps } from '../services/mapService';
import { getTournamentRegistrations, getUserRegistration } from '../services/registrationService';
import { PlayerCard } from '../components/PlayerCard';

export function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tournament, setTournament] = useState(null);
  const [maps, setMaps] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [userRegistration, setUserRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadTournament();
  }, [id]);

  async function loadTournament() {
    try {
      const { data: tournamentData, error: tournamentError } = await getTournament(id);
      
      if (tournamentError) throw tournamentError;
      
      console.log('Tournament data:', tournamentData); // Debug log
      setTournament(tournamentData);

      // Load maps
      const mapsData = await getTournamentMaps(id);
      setMaps(mapsData);

      // Load registrations (if registration is open or closed)
      if (tournamentData.status === 'registration_open' || tournamentData.status === 'registration_closed') {
        const registrationsData = await getTournamentRegistrations(id);
        setRegistrations(registrationsData);

        // Check user's registration status
        const userReg = await getUserRegistration(id);
        setUserRegistration(userReg);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!confirm('Publish this tournament for registration? Players will be able to register once published.')) {
      return;
    }

    setPublishing(true);
    try {
      await updateTournament(id, { status: 'registration_open' });
      await loadTournament(); // Reload to get updated status
    } catch (err) {
      alert('Failed to publish tournament: ' + err.message);
    } finally {
      setPublishing(false);
    }
  }

  async function handleCloseRegistration() {
    if (!confirm('Close registration for this tournament? No new players will be able to register.')) {
      return;
    }

    setPublishing(true);
    try {
      await updateTournament(id, { status: 'registration_closed' });
      await loadTournament();
    } catch (err) {
      alert('Failed to close registration: ' + err.message);
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          border: '3px solid #f3f4f6',
          borderTop: '3px solid #4f46e5',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '0.5rem',
          padding: '1rem',
          color: '#c00'
        }}>
          {error || 'Tournament not found'}
        </div>
      </div>
    );
  }

  const isAdmin = tournament.admin_id === user?.id;
  const isDraft = tournament.status === 'draft';
  const isRegistrationOpen = tournament.status === 'registration_open';

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem 1rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#111827',
            margin: '0 0 0.5rem 0'
          }}>
            {tournament.name}
          </h1>
          <div style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: '600',
            backgroundColor: getStatusColor(tournament.status).bg,
            color: getStatusColor(tournament.status).text
          }}>
            {getStatusLabel(tournament.status)}
          </div>
        </div>

        {isAdmin && (
          <div style={{
            display: 'flex',
            gap: '0.5rem'
          }}>
            {isDraft && (
              <button
                onClick={handlePublish}
                disabled={publishing || maps.length < 3}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: maps.length >= 3 ? '#4f46e5' : '#9ca3af',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: maps.length >= 3 ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem'
                }}
              >
                {publishing ? 'Publishing...' : 'Publish for Registration'}
              </button>
            )}
            {isRegistrationOpen && (
              <button
                onClick={handleCloseRegistration}
                disabled={publishing}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {publishing ? 'Closing...' : 'Close Registration'}
              </button>
            )}
            {(isRegistrationOpen || tournament.status === 'registration_closed') && (
              <button
                onClick={() => navigate(`/tournaments/${id}/categories`)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Categorize Players
              </button>
            )}
            <button
              onClick={() => navigate(`/tournaments/${id}/edit`)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#4f46e5',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Admin Warning */}
      {isDraft && maps.length < 3 && isAdmin && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#92400e'
        }}>
          ⚠️ Please select at least 3 maps before publishing the tournament.
        </div>
      )}

      {/* Main Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Tournament Info */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#111827'
          }}>
            Tournament Details
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tournament.description && (
              <div>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '0.25rem'
                }}>
                  Description
                </div>
                <div style={{ color: '#374151' }}>
                  {tournament.description}
                </div>
              </div>
            )}

            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                Format
              </div>
              <div style={{ color: '#374151' }}>
                Round Robin with Grand Final
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                Team Size
              </div>
              <div style={{ color: '#374151' }}>
                3v3
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                Match Format
              </div>
              <div style={{ color: '#374151', fontSize: '0.875rem' }}>
                • Round Robin: AP3 (All Played 3)<br/>
                • Semifinals: Best of 3<br/>
                • Grand Final: Best of 5
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                Created
              </div>
              <div style={{ color: '#374151', fontSize: '0.875rem' }}>
                {tournament.created_at 
                  ? (() => {
                      const date = new Date(tournament.created_at);
                      return !isNaN(date.getTime())
                        ? date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : tournament.created_at;
                    })()
                  : 'Unknown'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Map Pool */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#111827'
          }}>
            Map Pool ({maps.length})
          </h2>

          {maps.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280'
            }}>
              No maps selected yet
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '0.75rem'
            }}>
              {maps.map((map) => (
                <div
                  key={map.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    aspectRatio: '1 / 1',
                    backgroundColor: '#f3f4f6'
                  }}>
                    <img
                      src={map.image_url}
                      alt={map.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                  <div style={{
                    padding: '0.5rem',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    {map.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registration Section */}
      {(isRegistrationOpen || tournament.status === 'registration_closed') && (
        <div style={{
          marginTop: '2rem',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Participants ({registrations.length})
            </h2>
            {isRegistrationOpen && !userRegistration && !isAdmin && (
              <button
                onClick={() => navigate(`/tournaments/${id}/register`)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Register Now
              </button>
            )}
            {userRegistration && (
              <div style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dcfce7',
                color: '#166534',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                ✓ You are registered
              </div>
            )}
          </div>

          {registrations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280'
            }}>
              No participants yet. Be the first to register!
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {registrations.map((registration) => (
                <PlayerCard key={registration.id} registration={registration}>
                  <div
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#4f46e5';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#e5e7eb',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {registration.discord_avatar_url ? (
                        <img
                          src={registration.discord_avatar_url}
                          alt={registration.discord_username}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          color: '#9ca3af'
                        }}>
                          {registration.discord_username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Player Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#111827',
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {registration.discord_username}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.125rem'
                      }}>
                        {registration.preferred_position === 'flank' ? 'Flank' : 'Pocket'}
                      </div>
                    </div>
                  </div>
                </PlayerCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getStatusLabel(status) {
  const labels = {
    'draft': 'Draft',
    'registration_open': 'Registration Open',
    'registration_closed': 'Registration Closed',
    'in_progress': 'In Progress',
    'completed': 'Completed'
  };
  return labels[status] || status;
}

function getStatusColor(status) {
  const colors = {
    'draft': { bg: '#e5e7eb', text: '#374151' },
    'registration_open': { bg: '#dcfce7', text: '#166534' },
    'registration_closed': { bg: '#fed7aa', text: '#9a3412' },
    'in_progress': { bg: '#dbeafe', text: '#1e40af' },
    'completed': { bg: '#f3e8ff', text: '#6b21a8' }
  };
  return colors[status] || colors.draft;
}
