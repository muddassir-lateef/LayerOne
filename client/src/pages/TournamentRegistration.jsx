/**
 * Tournament Registration Form Component
 * 
 * Allows players to register for open tournaments with their preferences.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTournament } from '../services/tournamentService';
import { getTournamentMaps } from '../services/mapService';
import { getActiveCivilizations } from '../services/civilizationService';
import { registerForTournament, getUserRegistration } from '../services/registrationService';

export function TournamentRegistration() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [maps, setMaps] = useState([]);
  const [civilizations, setCivilizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [existingRegistration, setExistingRegistration] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    aoe2insightsUrl: '',
    preferredPosition: 'flank',
    preferredCivsFlank: [],
    preferredCivsPocket: [],
    preferredMaps: [],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      // Load tournament
      const { data: tournamentData, error: tournamentError } = await getTournament(id);
      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Check if already registered
      const registration = await getUserRegistration(id);
      setExistingRegistration(registration);

      // Load maps
      const mapsData = await getTournamentMaps(id);
      setMaps(mapsData);

      // Load civilizations
      const civsData = await getActiveCivilizations();
      setCivilizations(civsData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function toggleCivSelection(position, civName) {
    const field = position === 'flank' ? 'preferredCivsFlank' : 'preferredCivsPocket';
    const currentCivs = formData[field];
    
    if (currentCivs.includes(civName)) {
      // Remove
      handleInputChange(field, currentCivs.filter(c => c !== civName));
    } else {
      // Add (max 2)
      if (currentCivs.length < 2) {
        handleInputChange(field, [...currentCivs, civName]);
      }
    }
  }

  function toggleMapSelection(mapName) {
    const currentMaps = formData.preferredMaps;
    
    if (currentMaps.includes(mapName)) {
      // Remove
      handleInputChange('preferredMaps', currentMaps.filter(m => m !== mapName));
    } else {
      // Add (max 3)
      if (currentMaps.length < 3) {
        handleInputChange('preferredMaps', [...currentMaps, mapName]);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validation
    if (!formData.aoe2insightsUrl.trim()) {
      alert('Please enter your AoE2Insights URL');
      return;
    }

    if (formData.preferredCivsFlank.length !== 2) {
      alert('Please select exactly 2 civilizations for flank position');
      return;
    }

    if (formData.preferredCivsPocket.length !== 2) {
      alert('Please select exactly 2 civilizations for pocket position');
      return;
    }

    if (formData.preferredMaps.length !== 3) {
      alert('Please select exactly 3 preferred maps');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await registerForTournament({
        tournamentId: id,
        ...formData
      });

      if (error) throw error;

      alert('Registration successful!');
      navigate(`/tournaments/${id}`);
    } catch (err) {
      alert('Registration failed: ' + err.message);
    } finally {
      setSubmitting(false);
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
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
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

  if (tournament.status !== 'registration_open') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '0.5rem',
          padding: '1rem',
          color: '#92400e'
        }}>
          Registration is not open for this tournament.
        </div>
      </div>
    );
  }

  if (existingRegistration) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <div style={{
          backgroundColor: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '0.5rem',
          padding: '1rem',
          color: '#166534'
        }}>
          You are already registered for this tournament!
        </div>
        <button
          onClick={() => navigate(`/tournaments/${id}`)}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#4f46e5',
            color: 'white',
            borderRadius: '0.375rem',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Back to Tournament
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{
        fontSize: '1.875rem',
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        color: '#111827'
      }}>
        Register for {tournament.name}
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Fill out the form below to register for this tournament
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          {/* AoE2Insights URL */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              AoE2Insights Profile URL *
            </label>
            <input
              type="url"
              value={formData.aoe2insightsUrl}
              onChange={(e) => handleInputChange('aoe2insightsUrl', e.target.value)}
              placeholder="https://aoe2insights.com/user/..."
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Preferred Position */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Preferred Position *
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="position"
                  value="flank"
                  checked={formData.preferredPosition === 'flank'}
                  onChange={(e) => handleInputChange('preferredPosition', e.target.value)}
                  style={{ marginRight: '0.5rem' }}
                />
                Flank
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="position"
                  value="pocket"
                  checked={formData.preferredPosition === 'pocket'}
                  onChange={(e) => handleInputChange('preferredPosition', e.target.value)}
                  style={{ marginRight: '0.5rem' }}
                />
                Pocket
              </label>
            </div>
          </div>

          {/* Preferred Civs for Flank */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Preferred Civilizations for Flank Position * (Select 2)
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '0.5rem',
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '0.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem'
            }}>
              {civilizations.map((civ) => (
                <div
                  key={`flank-${civ.id}`}
                  onClick={() => toggleCivSelection('flank', civ.name)}
                  style={{
                    padding: '0.5rem',
                    border: formData.preferredCivsFlank.includes(civ.name) 
                      ? '2px solid #4f46e5' 
                      : '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    backgroundColor: formData.preferredCivsFlank.includes(civ.name) 
                      ? '#eef2ff' 
                      : 'white',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    fontWeight: formData.preferredCivsFlank.includes(civ.name) ? '600' : '400'
                  }}
                >
                  {civ.name}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
              Selected: {formData.preferredCivsFlank.length}/2
            </div>
          </div>

          {/* Preferred Civs for Pocket */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Preferred Civilizations for Pocket Position * (Select 2)
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '0.5rem',
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '0.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem'
            }}>
              {civilizations.map((civ) => (
                <div
                  key={`pocket-${civ.id}`}
                  onClick={() => toggleCivSelection('pocket', civ.name)}
                  style={{
                    padding: '0.5rem',
                    border: formData.preferredCivsPocket.includes(civ.name) 
                      ? '2px solid #4f46e5' 
                      : '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    backgroundColor: formData.preferredCivsPocket.includes(civ.name) 
                      ? '#eef2ff' 
                      : 'white',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    fontWeight: formData.preferredCivsPocket.includes(civ.name) ? '600' : '400'
                  }}
                >
                  {civ.name}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
              Selected: {formData.preferredCivsPocket.length}/2
            </div>
          </div>

          {/* Preferred Maps */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Preferred Maps * (Select 3 from tournament map pool)
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '0.75rem'
            }}>
              {maps.map((map) => (
                <div
                  key={map.id}
                  onClick={() => toggleMapSelection(map.name)}
                  style={{
                    border: formData.preferredMaps.includes(map.name)
                      ? '2px solid #4f46e5'
                      : '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: formData.preferredMaps.includes(map.name)
                      ? '#eef2ff'
                      : 'white'
                  }}
                >
                  <div style={{ aspectRatio: '1 / 1', backgroundColor: '#f3f4f6' }}>
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
                    fontWeight: formData.preferredMaps.includes(map.name) ? '600' : '400',
                    color: '#374151'
                  }}>
                    {map.name}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
              Selected: {formData.preferredMaps.length}/3
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Additional Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              placeholder="Any additional information you'd like to share..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: submitting ? '#9ca3af' : '#4f46e5',
                color: 'white',
                borderRadius: '0.375rem',
                fontWeight: '600',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              {submitting ? 'Registering...' : 'Register'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/tournaments/${id}`)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
