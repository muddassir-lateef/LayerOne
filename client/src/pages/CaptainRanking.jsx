import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlayerCard } from '../components/PlayerCard';
import './CaptainRanking.css';

// Sortable Captain Card Component
const SortableCaptainCard = React.memo(function SortableCaptainCard({ captain, index }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: captain.user_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <PlayerCard registration={{ ...captain, category: 'S-Tier' }}>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`captain-card ${isDragging ? 'dragging' : ''}`}
      >
        <div className="captain-rank">#{index + 1}</div>
        <img 
          src={captain.discord_avatar_url || `https://i.pravatar.cc/150?u=${captain.user_id}`}
          alt={captain.discord_username}
          className="captain-avatar"
        />
        <div className="captain-info">
          <div className="captain-name">{captain.discord_username}</div>
          <div className="captain-tier">S-Tier Captain</div>
        </div>
        <div className="drag-handle">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="6" cy="5" r="2"/>
            <circle cx="14" cy="5" r="2"/>
            <circle cx="6" cy="10" r="2"/>
            <circle cx="14" cy="10" r="2"/>
            <circle cx="6" cy="15" r="2"/>
            <circle cx="14" cy="15" r="2"/>
          </svg>
        </div>
      </div>
    </PlayerCard>
  );
});

const CaptainRanking = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [captains, setCaptains] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [rankingSaved, setRankingSaved] = useState(false);
  const [error, setError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Check if teams already exist (ranking already saved)
      const { data: existingTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, captain_id, draft_order')
        .eq('tournament_id', tournamentId)
        .order('draft_order', { ascending: true });

      if (teamsError) throw teamsError;

      if (existingTeams && existingTeams.length > 0) {
        // Teams exist, load captain order from teams
        setRankingSaved(true);
        
        // Get S-Tier player categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('player_categories')
          .select('user_id, category')
          .eq('tournament_id', tournamentId)
          .eq('category', 'S-Tier');

        if (categoriesError) throw categoriesError;

        const sTierUserIds = categoriesData.map(c => c.user_id);

        // Get registration details for these users
        const { data: registrationsData, error: registrationsError } = await supabase
          .from('registrations')
          .select('*')
          .eq('tournament_id', tournamentId)
          .in('user_id', sTierUserIds);

        if (registrationsError) throw registrationsError;

        // Map to captain objects
        const captainsMap = {};
        registrationsData.forEach(reg => {
          captainsMap[reg.user_id] = reg;
        });

        // Order captains by saved draft_order
        const orderedCaptains = existingTeams
          .map(team => captainsMap[team.captain_id])
          .filter(Boolean); // Remove any undefined entries

        setCaptains(orderedCaptains);
      } else {
        // No teams yet, load S-Tier players
        // Get S-Tier player categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('player_categories')
          .select('user_id, category')
          .eq('tournament_id', tournamentId)
          .eq('category', 'S-Tier');

        if (categoriesError) throw categoriesError;

        const sTierUserIds = categoriesData.map(c => c.user_id);

        // Get registration details for these users
        const { data: registrationsData, error: registrationsError } = await supabase
          .from('registrations')
          .select('*')
          .eq('tournament_id', tournamentId)
          .in('user_id', sTierUserIds);

        if (registrationsError) throw registrationsError;

        // Transform data
        const captainsList = registrationsData;

        setCaptains(captainsList);
        setRankingSaved(false);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setCaptains((items) => {
        const oldIndex = items.findIndex((item) => item.user_id === active.id);
        const newIndex = items.findIndex((item) => item.user_id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveRanking = async () => {
    if (captains.length === 0) {
      setError('No S-Tier players to rank!');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Check if teams already exist
      const { data: existingTeams, error: checkError } = await supabase
        .from('teams')
        .select('id, captain_id, draft_order')
        .eq('tournament_id', tournamentId);

      if (checkError) throw checkError;

      if (existingTeams && existingTeams.length > 0) {
        // Update existing teams' draft_order
        for (let i = 0; i < captains.length; i++) {
          const captain = captains[i];
          const team = existingTeams.find(t => t.captain_id === captain.user_id);
          
          if (team) {
            const { error: updateError } = await supabase
              .from('teams')
              .update({ draft_order: i + 1 })
              .eq('id', team.id);

            if (updateError) throw updateError;

            // Ensure captain is in team_members (if not already)
            const { data: existingMember, error: checkMemberError } = await supabase
              .from('team_members')
              .select('id')
              .eq('team_id', team.id)
              .eq('user_id', captain.user_id)
              .maybeSingle();

            if (checkMemberError) throw checkMemberError;

            if (!existingMember) {
              // Add captain to team_members
              const { error: insertMemberError } = await supabase
                .from('team_members')
                .insert({
                  team_id: team.id,
                  user_id: captain.user_id,
                  is_captain: true,
                  category_when_drafted: 'S-Tier',
                  draft_round: 0,
                  draft_pick_number: 0,
                });

              if (insertMemberError) throw insertMemberError;
            }
          }
        }
      } else {
        // Create new teams with ranking - use captain's name for team name
        const teamsToCreate = captains.map((captain, index) => ({
          tournament_id: tournamentId,
          name: captain.discord_username ? `${captain.discord_username} Team` : `Team ${index + 1}`,
          captain_id: captain.user_id,
          draft_order: index + 1,
        }));

        const { data: createdTeams, error: teamsError } = await supabase
          .from('teams')
          .insert(teamsToCreate)
          .select();

        if (teamsError) throw teamsError;

        // Add captains to team_members
        const teamMembers = createdTeams.map(team => ({
          team_id: team.id,
          user_id: team.captain_id,
          is_captain: true,
          category_when_drafted: 'S-Tier',
          draft_round: 0,
          draft_pick_number: 0,
        }));

        const { error: membersError } = await supabase
          .from('team_members')
          .insert(teamMembers);

        if (membersError) throw membersError;
      }

      // Update tournament status if needed
      if (tournament.status === 'categorizing') {
        const { error: updateError } = await supabase
          .from('tournaments')
          .update({ status: 'awaiting_captain_ranking' })
          .eq('id', tournamentId);

        if (updateError) throw updateError;
      }

      setRankingSaved(true);
      setHasUnsavedChanges(false);
      alert('Captain ranking saved successfully!');
    } catch (err) {
      console.error('Error saving ranking:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStartTournament = async () => {
    if (!rankingSaved) {
      setError('Please save the captain ranking first!');
      return;
    }

    if (captains.length === 0) {
      setError('No captains to start tournament!');
      return;
    }

    if (!confirm(`Start tournament with ${captains.length} teams? This will open the draft room for captains.`)) {
      return;
    }

    try {
      setStarting(true);
      setError(null);

      console.log('Starting tournament for:', tournamentId);

      // Get existing teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, captain_id')
        .eq('tournament_id', tournamentId)
        .order('draft_order', { ascending: true });

      if (teamsError) throw teamsError;

      if (!teams || teams.length === 0) {
        throw new Error('No teams found. Please save ranking first.');
      }

      console.log('Found teams:', teams);

      // Check if draft session already exists
      const { data: existingSession, error: existingError } = await supabase
        .from('draft_sessions')
        .select('id')
        .eq('tournament_id', tournamentId)
        .maybeSingle();

      if (existingError) {
        console.error('Error checking existing session:', existingError);
      }

      if (existingSession) {
        console.log('Draft session already exists, navigating to it');
        navigate(`/tournaments/${tournamentId}/draft`);
        return;
      }

      // Create draft session
      console.log('Creating draft session...');
      const { data: draftSession, error: draftError } = await supabase
        .from('draft_sessions')
        .insert({
          tournament_id: tournamentId,
          status: 'waiting_for_captains',
          current_category: 'A-Tier',
          pick_timer_seconds: 60,
        })
        .select()
        .single();

      if (draftError) {
        console.error('Draft session creation error:', draftError);
        throw draftError;
      }

      console.log('Draft session created:', draftSession);

      // Note: Captain presence is now handled by Supabase Realtime Presence
      // No need to create database records - captains will track presence when they join

      // Update tournament status
      console.log('Updating tournament status...');
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'draft_ready' })
        .eq('id', tournamentId);

      if (updateError) {
        console.error('Tournament update error:', updateError);
        throw updateError;
      }

      console.log('Tournament status updated');

      // Small delay to ensure database commit completes
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Navigating to draft room');

      // Navigate to draft room
      navigate(`/tournaments/${tournamentId}/draft`);
    } catch (err) {
      console.error('Error starting tournament:', err);
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="captain-ranking-container">
        <div className="loading">Loading captains...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="captain-ranking-container">
        <div className="error">Error: {error}</div>
        <button onClick={loadData} className="btn-secondary">Retry</button>
      </div>
    );
  }

  return (
    <div className="captain-ranking-container">
      <div className="captain-ranking-header">
        <div>
          <h1>Rank Team Captains</h1>
          <p className="subtitle">
            Drag and drop to set the draft order for {captains.length} teams
          </p>
        </div>
        <button
          onClick={() => navigate(`/tournaments/${tournamentId}`)}
          className="btn-secondary"
        >
          Back to Tournament
        </button>
      </div>

      {captains.length === 0 ? (
        <div className="empty-state">
          <h3>No S-Tier Players</h3>
          <p>You need to assign at least one player to S-Tier to create captains.</p>
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}/categories`)}
            className="btn-primary"
          >
            Go to Player Categories
          </button>
        </div>
      ) : (
        <>
          <div className="ranking-explanation">
            <h3>Draft Order</h3>
            <p>
              The order you set here determines which captain picks first in each round.
              The draft follows a snake pattern:
            </p>
            <div className="snake-example">
              <div>Round 1: Captain 1 → 2 → 3 → 4</div>
              <div>Round 2: Captain 4 → 3 → 2 → 1</div>
              <div>Round 3: Captain 1 → 2 → 3 → 4</div>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={captains.map(c => c.user_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="captains-list">
                {captains.map((captain, index) => (
                  <SortableCaptainCard
                    key={captain.user_id}
                    captain={captain}
                    index={index}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="ranking-actions">
            <button
              onClick={handleSaveRanking}
              disabled={saving || (rankingSaved && !hasUnsavedChanges)}
              className="btn-secondary btn-large"
            >
              {saving ? 'Saving...' : rankingSaved && !hasUnsavedChanges ? 'Ranking Saved ✓' : 'Save Captain Ranking'}
            </button>
            
            <button
              onClick={handleStartTournament}
              disabled={!rankingSaved || starting}
              className="btn-primary btn-large"
              title={!rankingSaved ? 'Save ranking first' : ''}
            >
              {starting ? 'Starting...' : 'Start Tournament & Open Draft Room'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CaptainRanking;
