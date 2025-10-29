import { useState, useEffect } from 'react';
import { getActiveMaps } from '../services/mapService';

export default function MapSelector({ selectedMapIds = [], onChange }) {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaps();
  }, []);

  async function loadMaps() {
    try {
      const data = await getActiveMaps();
      setMaps(data);
    } catch (error) {
      console.error('Failed to load maps:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleMap(mapId) {
    const isSelected = selectedMapIds.includes(mapId);
    let newSelection;

    if (isSelected) {
      // Remove map
      newSelection = selectedMapIds.filter(id => id !== mapId);
    } else {
      // Add map (no limit)
      newSelection = [...selectedMapIds, mapId];
    }

    onChange(newSelection);
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-gray-600">Loading maps...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        marginBottom: '1rem',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        Select at least 3 maps for your tournament pool ({selectedMapIds.length} selected)
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '0.75rem',
        width: '100%'
      }}>
        {maps.map((map) => {
          const isSelected = selectedMapIds.includes(map.id);
          
          return (
            <button
              key={map.id}
              type="button"
              onClick={() => toggleMap(map.id)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '0.5rem',
                border: isSelected ? '2px solid #4f46e5' : '2px solid #e5e7eb',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                boxShadow: isSelected ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#a5b4fc';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }
              }}
            >
              {/* Map Image */}
              <div style={{
                width: '100%',
                aspectRatio: '1 / 1',
                overflow: 'hidden',
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

              {/* Map Info */}
              <div style={{ padding: '0.5rem' }}>
                <h3 style={{
                  fontWeight: '600',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  margin: 0
                }}>
                  {map.name}
                  {isSelected && (
                    <svg style={{ width: '1rem', height: '1rem', color: '#4f46e5', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </h3>
                <p style={{
                  fontSize: '0.65rem',
                  color: '#6b7280',
                  marginTop: '0.25rem',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {map.description}
                </p>
              </div>

              {/* Selection Badge */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem'
                }}>
                  SELECTED
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Validation Warning */}
      {selectedMapIds.length > 0 && selectedMapIds.length < 3 && (
        <p style={{
          marginTop: '1rem',
          fontSize: '0.875rem',
          color: '#d97706'
        }}>
          ⚠️ Please select at least 3 maps
        </p>
      )}
    </div>
  );
}
