import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTeams } from '../services/draftService';
import { generateBracket } from '../services/bracketService';
import './TeamManagement.css';

const TeamManagement = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
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

      // Load teams with members
      const teamsData = await getTeams(tournamentId);
      
      // Load team members for each team
      const teamsWithMembers = await Promise.all(teamsData.map(async (team) => {
        const { data: teamMembers, error: membersError } = await supabase
          .from('team_members')
          .select('user_id, is_captain, category_when_drafted, draft_pick_number')
          .eq('team_id', team.id)
          .order('draft_pick_number', { ascending: true });

        if (membersError) {
          console.error('Error loading team members:', membersError);
          return { ...team, members: [] };
        }

        // Load registration data for each member
        const membersWithData = await Promise.all((teamMembers || []).map(async (member) => {
          const { data: registration, error: regError } = await supabase
            .from('registrations')
            .select('discord_username, discord_avatar_url, preferred_position')
            .eq('tournament_id', tournamentId)
            .eq('user_id', member.user_id)
            .maybeSingle();

          if (regError) {
            console.error('Error loading registration for user:', member.user_id, regError);
          }

          return {
            ...member,
            registrations: registration
          };
        }));

        return {
          ...team,
          members: membersWithData
        };
      }));

      setTeams(teamsWithMembers);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (team) => {
    setEditingTeam(team.id);
    setNewTeamName(team.name);
    setLogoFile(null);
  };

  const handleCancelEdit = () => {
    setEditingTeam(null);
    setNewTeamName('');
    setLogoFile(null);
  };

  const handleSaveTeam = async (teamId) => {
    try {
      setSaving(true);
      setError(null);

      let logoUrl = teams.find(t => t.id === teamId)?.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${teamId}-${Date.now()}.${fileExt}`;
        const filePath = `team-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('tournament-assets')
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('tournament-assets')
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
      }

      // Update team
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          name: newTeamName,
          logo_url: logoUrl
        })
        .eq('id', teamId);

      if (updateError) throw updateError;

      // Reload teams
      await loadData();
      handleCancelEdit();
      alert('Team updated successfully!');
    } catch (err) {
      console.error('Error saving team:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    if (!confirm('Remove this player from the team?')) return;

    try {
      setSaving(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      await loadData();
      alert('Player removed from team');
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (!confirm(`Generate bracket for ${teams.length} teams? This will create all Round Robin and Playoff matches.`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const result = await generateBracket(tournamentId);
      
      // Update tournament status to 'in_progress'
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'in_progress' })
        .eq('id', tournamentId);

      if (updateError) throw updateError;

      alert(`Bracket generated successfully!\n${result.roundRobin.length} Round Robin matches\n${result.playoffs.length} Playoff matches`);
      navigate(`/tournaments/${tournamentId}`);
    } catch (err) {
      console.error('Error generating bracket:', err);
      setError(err.message);
      alert('Failed to generate bracket: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="team-management-container">
        <div className="loading">Loading team data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-management-container">
        <div className="error">Error: {error}</div>
        <button onClick={loadData} className="btn-secondary">Retry</button>
      </div>
    );
  }

  return (
    <div className="team-management-container">
      <div className="team-management-header">
        <div>
          <h1>Team Management</h1>
          <p className="subtitle">{tournament?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleGenerateBracket}
            disabled={saving || teams.length < 4}
            className="btn-primary"
            title={teams.length < 4 ? 'At least 4 teams required' : 'Generate bracket and start tournament'}
          >
            {saving ? 'Generating...' : '🏆 Finalize Teams & Generate Bracket'}
          </button>
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className="btn-secondary"
          >
            Back to Tournament
          </button>
        </div>
      </div>

      <div className="teams-grid">
        {teams.map((team) => (
          <div key={team.id} className="team-card">
            <div className="team-card-header">
              {editingTeam === team.id ? (
                <div className="team-edit-form">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Team Name"
                    className="team-name-input"
                  />
                  <div className="logo-upload">
                    <label htmlFor={`logo-${team.id}`} className="logo-label">
                      {logoFile ? logoFile.name : 'Upload Logo (optional)'}
                    </label>
                    <input
                      id={`logo-${team.id}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <div className="edit-actions">
                    <button
                      onClick={() => handleSaveTeam(team.id)}
                      disabled={saving || !newTeamName.trim()}
                      className="btn-primary btn-small"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="btn-secondary btn-small"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="team-header-info">
                    {team.logo_url && (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="team-logo"
                      />
                    )}
                    <div>
                      <h3>{team.name}</h3>
                      <span className="team-order">Draft Order: #{team.draft_order}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartEdit(team)}
                    className="btn-secondary btn-small"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>

            <div className="team-members-list">
              <h4>Team Members ({team.members.length})</h4>
              {team.members.map((member) => (
                <div key={member.user_id} className="member-row">
                  <div className="member-info">
                    {member.registrations?.discord_avatar_url && (
                      <img
                        src={member.registrations.discord_avatar_url}
                        alt={member.registrations?.discord_username}
                        className="member-avatar"
                      />
                    )}
                    <div>
                      <div className="member-name">
                        {member.is_captain && <span className="captain-badge">⭐</span>}
                        {member.registrations?.discord_username || 'Unknown Player'}
                      </div>
                      <div className="member-meta">
                        <span className={`category-badge ${member.category_when_drafted?.toLowerCase().replace('-', '')}`}>
                          {member.category_when_drafted}
                        </span>
                        <span className="position-badge">
                          {member.registrations?.preferred_position}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!member.is_captain && (
                    <button
                      onClick={() => handleRemoveMember(team.id, member.user_id)}
                      disabled={saving}
                      className="btn-danger btn-small"
                      title="Remove from team"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamManagement;
