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
import { getTeams } from '../services/draftService';
import { getTournamentUpcomingMatches } from '../services/scheduleService';
import { supabase } from '../lib/supabase';
import { PlayerCard } from '../components/PlayerCard';

export function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tournament, setTournament] = useState(null);
  const [maps, setMaps] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [scheduledMatches, setScheduledMatches] = useState([]);
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

      // Load registrations (if tournament is published - not in draft)
      if (tournamentData.status !== 'draft') {
        const registrationsData = await getTournamentRegistrations(id);
        
        // Get all team members for this tournament in one query
        const { data: teamMembersData, error: teamMembersError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            teams!inner (
              id,
              name,
              tournament_id
            )
          `)
          .eq('teams.tournament_id', id);

        if (teamMembersError) {
          console.error('Error fetching team members:', teamMembersError);
        }

        // Create a map of user_id -> team_name
        const userTeamMap = {};
        if (teamMembersData) {
          teamMembersData.forEach(tm => {
            userTeamMap[tm.user_id] = tm.teams.name;
          });
        }

        console.log('User team map:', userTeamMap); // Debug log

        // Enhance registrations with team info
        const registrationsWithTeams = registrationsData.map(reg => ({
          ...reg,
          team_name: userTeamMap[reg.user_id] || null
        }));

        console.log('Registrations with teams:', registrationsWithTeams); // Debug log
        setRegistrations(registrationsWithTeams);

        // Check user's registration status
        const userReg = await getUserRegistration(id);
        setUserRegistration(userReg);
      }

      // Load teams if draft is complete or in progress
      if (['draft_ready', 'draft_in_progress', 'teams_finalized', 'in_progress', 'completed'].includes(tournamentData.status)) {
        const teamsData = await getTeams(id);
        
        // Load team members and their registration info
        const teamsWithMembers = await Promise.all(teamsData.map(async (team) => {
          const { data: members } = await supabase
            .from('team_members')
            .select('user_id, is_captain, category_when_drafted, draft_round, draft_pick_number')
            .eq('team_id', team.id)
            .order('draft_pick_number', { ascending: true });

          if (!members) return { ...team, members: [] };

          // Get registration info for each member
          const membersWithInfo = await Promise.all(members.map(async (member) => {
            const { data: reg, error: regError } = await supabase
              .from('registrations')
              .select('*')
              .eq('tournament_id', id)
              .eq('user_id', member.user_id)
              .maybeSingle();

            if (regError) {
              console.error('Error fetching registration for user:', member.user_id, regError);
            }

            return { 
              ...member,
              ...reg,
              category_when_drafted: member.category_when_drafted, // Preserve draft category
              team_name: team.name // Add team name
            };
          }));

          return { ...team, members: membersWithInfo };
        }));

        console.log('Teams with members:', teamsWithMembers); // Debug log
        setTeams(teamsWithMembers);
      }

      // Load scheduled matches if tournament has started
      if (['in_progress', 'completed'].includes(tournamentData.status)) {
        try {
          const upcomingMatches = await getTournamentUpcomingMatches(id, 20);
          console.log('Tournament status:', tournamentData.status);
          console.log('Scheduled matches loaded:', upcomingMatches);
          console.log('Number of scheduled matches:', upcomingMatches?.length || 0);
          setScheduledMatches(upcomingMatches);
        } catch (err) {
          console.error('Error loading scheduled matches:', err);
        }
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
            {(tournament.status === 'registration_closed' || tournament.status === 'categorizing' || tournament.status === 'awaiting_captain_ranking') && (
              <button
                onClick={() => navigate(`/tournaments/${id}/captains`)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Rank Captains
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

        {/* Go to Draft button - visible to everyone */}
        {(tournament.status === 'draft_ready' || tournament.status === 'draft_in_progress') && (
          <button
            onClick={() => navigate(`/tournaments/${id}/draft`)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              borderRadius: '0.375rem',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              animation: tournament.status === 'draft_in_progress' ? 'pulse 2s ease-in-out infinite' : 'none'
            }}
          >
            {tournament.status === 'draft_in_progress' ? '🔴 Go to Live Draft' : '📋 Go to Draft Room'}
          </button>
        )}

        {/* Manage Teams button - visible to admin when teams exist */}
        {isAdmin && teams.length > 0 && (
          <button
            onClick={() => navigate(`/tournaments/${id}/teams`)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              borderRadius: '0.375rem',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            ⚙️ Manage Teams
          </button>
        )}

        {/* View Bracket button - visible when tournament has matches */}
        {(tournament.status === 'in_progress' || tournament.status === 'completed') && (
          <button
            onClick={() => navigate(`/tournaments/${id}/bracket`)}
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
            🏆 View Bracket
          </button>
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

      {/* Registration/Participants Section */}
      {(isRegistrationOpen || tournament.status === 'registration_closed' || tournament.status === 'categorizing' || tournament.status === 'awaiting_captain_ranking' || tournament.status === 'draft_ready' || tournament.status === 'draft_in_progress' || tournament.status === 'teams_finalized') && (
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

      {/* Teams Section - Show after draft starts */}
      {teams.length > 0 && (
        <div style={{
          marginTop: '2rem',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '1.5rem'
          }}>
            Teams ({teams.length})
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {teams.map((team) => (
              <div key={team.id} style={{
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.25rem',
                backgroundColor: '#f9fafb',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#4f46e5';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                {/* Team Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#111827',
                    margin: 0
                  }}>
                    {team.name}
                  </h3>
                  <div style={{
                    background: '#4f46e5',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px'
                  }}>
                    #{team.draft_order}
                  </div>
                </div>

                {/* Team Members */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {team.members.map((member) => (
                    <PlayerCard 
                      key={member.user_id} 
                      registration={{
                        ...member,
                        category: member.category_when_drafted,
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem',
                        background: member.is_captain ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'white',
                        border: `1px solid ${member.is_captain ? '#fbbf24' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        transition: 'transform 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}>
                        {/* Avatar */}
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: `2px solid ${member.is_captain ? '#fbbf24' : '#e5e7eb'}`,
                          flexShrink: 0,
                          backgroundColor: '#e5e7eb'
                        }}>
                          {member.discord_avatar_url ? (
                            <img
                              src={member.discord_avatar_url}
                              alt={member.discord_username}
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
                              fontSize: '1.25rem',
                              fontWeight: 'bold',
                              color: '#6b7280'
                            }}>
                              {member.discord_username?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>

                        {/* Member Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#111827',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {member.is_captain && '⭐ '}{member.discord_username || 'Unknown'}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginTop: '0.125rem'
                          }}>
                            {member.preferred_position === 'flank' ? 'Flank' : 'Pocket'}
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: getCategoryColor(member.category_when_drafted).bg,
                          color: getCategoryColor(member.category_when_drafted).text
                        }}>
                          {member.category_when_drafted}
                        </div>
                      </div>
                    </PlayerCard>
                  ))}
                </div>

                {/* Team Stats */}
                <div style={{
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  <span>Total: {team.members.length} players</span>
                  <span>Pick Order: #{team.draft_order}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Matches Section */}
      {scheduledMatches.length > 0 && (
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
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              📅 Scheduled Matches
            </h2>
            <button
              onClick={() => navigate(`/tournaments/${id}/bracket`)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#4f46e5',
                color: 'white',
                borderRadius: '0.375rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              View Full Bracket
            </button>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {scheduledMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => navigate(`/tournaments/${id}/bracket`)}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4f46e5';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(79, 70, 229, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Match Time */}
                <div style={{
                  minWidth: '140px',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '1.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    📅
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    opacity: 0.9
                  }}>
                    {new Date(match.scheduled_time).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    marginTop: '0.25rem'
                  }}>
                    {new Date(match.scheduled_time).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Match Info */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem'
                  }}>
                    {match.phase.replace('_', ' ')} • Best of {match.best_of}
                  </div>
                  
                  {/* Teams */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 1
                    }}>
                      {match.team1?.logo_url && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: '2px solid #e5e7eb',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          <img
                            src={match.team1.logo_url}
                            alt={match.team1.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      )}
                      <span style={{
                        fontWeight: '600',
                        color: '#111827',
                        fontSize: '0.875rem'
                      }}>
                        {match.team1?.name || 'TBD'}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      color: '#6b7280'
                    }}>
                      VS
                    </span>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 1
                    }}>
                      {match.team2?.logo_url && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: '2px solid #e5e7eb',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          <img
                            src={match.team2.logo_url}
                            alt={match.team2.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      )}
                      <span style={{
                        fontWeight: '600',
                        color: '#111827',
                        fontSize: '0.875rem'
                      }}>
                        {match.team2?.name || 'TBD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  fontSize: '1.5rem',
                  color: '#9ca3af'
                }}>
                  →
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category) {
  const colors = {
    'S-Tier': { bg: '#fef3c7', text: '#92400e' },
    'A-Tier': { bg: '#dbeafe', text: '#1e40af' },
    'B-Tier': { bg: '#e0e7ff', text: '#4338ca' },
    'Misc': { bg: '#f3f4f6', text: '#374151' }
  };
  return colors[category] || colors['Misc'];
}

function getStatusLabel(status) {
  const labels = {
    'draft': 'Draft',
    'registration_open': 'Registration Open',
    'registration_closed': 'Registration Closed',
    'categorizing': 'Categorizing Players',
    'awaiting_captain_ranking': 'Awaiting Captain Ranking',
    'draft_ready': 'Draft Ready',
    'draft_in_progress': 'Draft In Progress',
    'teams_finalized': 'Teams Finalized',
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
    'categorizing': { bg: '#dbeafe', text: '#1e40af' },
    'awaiting_captain_ranking': { bg: '#e0e7ff', text: '#4338ca' },
    'draft_ready': { bg: '#fef3c7', text: '#92400e' },
    'draft_in_progress': { bg: '#f3e8ff', text: '#7c3aed' },
    'teams_finalized': { bg: '#d1fae5', text: '#065f46' },
    'in_progress': { bg: '#dbeafe', text: '#1e40af' },
    'completed': { bg: '#f3e8ff', text: '#6b21a8' }
  };
  return colors[status] || colors.draft;
}
