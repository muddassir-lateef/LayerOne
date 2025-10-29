/**
 * Create Tournament Page
 * 
 * Simple form for creating a new tournament.
 * Only requires name and description (Phase 1).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTournament } from '../services/tournamentService';
import { addMapsToTournament } from '../services/mapService';
import MapSelector from '../components/MapSelector';
import './CreateTournament.css';

export function CreateTournament() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [selectedMapIds, setSelectedMapIds] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Tournament name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Tournament name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Tournament name must be less than 100 characters';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    // Map validation
    if (selectedMapIds.length < 3) {
      newErrors.maps = 'Please select at least 3 maps';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Step 1: Create tournament
      const { data, error } = await createTournament(formData);
      
      if (error) {
        setErrors({ submit: error.message || 'Failed to create tournament' });
        setIsSubmitting(false);
        return;
      }
      
      // Step 2: Add selected maps
      try {
        await addMapsToTournament(data.id, selectedMapIds);
      } catch (mapError) {
        console.error('Failed to add maps:', mapError);
        setErrors({ submit: 'Tournament created but failed to add maps' });
        setIsSubmitting(false);
        return;
      }
      
      // Success! Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred' });
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="create-tournament-container">
      <div className="create-tournament-card">
        {/* Header */}
        <div className="form-header">
          <h1>Create Tournament</h1>
          <p className="form-subtitle">
            Set up a new 3v3 Round Robin tournament with Grand Final
          </p>
        </div>

        {/* Tournament Info Box */}
        <div className="tournament-info-box">
          <h3>Tournament Format</h3>
          <div className="info-items">
            <div className="info-item">
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Round Robin with Grand Final</span>
            </div>
            <div className="info-item">
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>3v3 Team Size</span>
            </div>
            <div className="info-item">
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>AP3 (Round Robin), Bo3 (Semis), Bo5 (Final)</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="tournament-form">
          {/* Tournament Name */}
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Tournament Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Summer Championship 2025"
              className={`form-input ${errors.name ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            {errors.name && (
              <span className="error-text">{errors.name}</span>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add tournament details, rules, or any other information..."
              rows={5}
              className={`form-textarea ${errors.description ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            <div className="char-count">
              {formData.description.length} / 500
            </div>
            {errors.description && (
              <span className="error-text">{errors.description}</span>
            )}
          </div>

          {/* Map Pool Selection */}
          <div className="form-group">
            <label className="form-label">
              Map Pool *
            </label>
            <MapSelector 
              selectedMapIds={selectedMapIds}
              onChange={setSelectedMapIds}
            />
            {errors.maps && (
              <span className="error-text">{errors.maps}</span>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="submit-error">
              {errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-cancel"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
