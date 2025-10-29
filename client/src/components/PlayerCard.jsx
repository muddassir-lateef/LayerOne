/**
 * Player Card Component
 * 
 * Displays player information on hover, including:
 * - Discord username and avatar
 * - AoE2Insights profile link
 * - Preferred position (Flank/Pocket)
 * - Preferred civilizations for both positions
 * - Preferred maps
 * - Additional notes
 */

import { useState, useRef, useEffect } from 'react';

const TIER_COLORS = {
  'S-Tier': { bg: '#fee2e2', text: '#991b1b', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
  'A-Tier': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  'B-Tier': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6', glow: 'rgba(59, 130, 246, 0.3)' },
  'Misc': { bg: '#f3f4f6', text: '#374151', border: '#6b7280', glow: 'rgba(107, 114, 128, 0.3)' }
};

export function PlayerCard({ registration, children }) {
  const [isHovered, setIsHovered] = useState(false);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (isHovered && triggerRef.current && cardRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate initial position (right of trigger)
      let left = triggerRect.right + 10;
      let top = triggerRect.top;

      // If card would overflow right edge, show on left side
      if (left + cardRect.width > viewportWidth - 20) {
        left = triggerRect.left - cardRect.width - 10;
      }

      // If card would overflow bottom, adjust upward
      if (top + cardRect.height > viewportHeight - 20) {
        top = viewportHeight - cardRect.height - 20;
      }

      // If card would overflow top, adjust downward
      if (top < 20) {
        top = 20;
      }

      setCardPosition({ top, left });
    }
  }, [isHovered]);

  if (!registration) {
    return children;
  }

  return (
    <div
      ref={triggerRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {/* Add pulse animation styles */}
      {isHovered && (
        <style>
          {`
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }
          `}
        </style>
      )}

      {isHovered && (
        <>
          {/* Invisible bridge to prevent gap hover issues */}
          {triggerRef.current && cardRef.current && (
            <div
              style={{
                position: 'fixed',
                top: `${Math.min(cardPosition.top, triggerRef.current.getBoundingClientRect().top)}px`,
                left: `${triggerRef.current.getBoundingClientRect().right}px`,
                width: `${Math.abs(cardPosition.left - triggerRef.current.getBoundingClientRect().right) + 20}px`,
                height: `${Math.max(
                  cardRef.current.getBoundingClientRect().height,
                  triggerRef.current.getBoundingClientRect().bottom - Math.min(cardPosition.top, triggerRef.current.getBoundingClientRect().top)
                )}px`,
                zIndex: 9998,
                pointerEvents: 'auto'
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            />
          )}
          <div
            ref={cardRef}
            style={{
              position: 'fixed',
              top: `${cardPosition.top}px`,
              left: `${cardPosition.left}px`,
              zIndex: 9999,
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: registration.category 
                ? `0 10px 25px rgba(0,0,0,0.15), 0 0 20px ${TIER_COLORS[registration.category].glow}`
                : '0 10px 25px rgba(0,0,0,0.15)',
              padding: '1rem',
              minWidth: '280px',
              maxWidth: '320px',
              border: registration.category
                ? `2px solid ${TIER_COLORS[registration.category].border}`
                : '1px solid #e5e7eb',
              pointerEvents: 'auto'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
          {/* Header with Avatar and Name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: '600',
                fontSize: '1rem',
                color: '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {registration.discord_username}
              </div>
              {registration.aoe2insights_url && (
                <a
                  href={registration.aoe2insights_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.75rem',
                    color: '#4f46e5',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  View AoE2Insights →
                </a>
              )}
            </div>
          </div>

          {/* Player Category Badge */}
          {registration.category && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                backgroundColor: TIER_COLORS[registration.category].bg,
                color: TIER_COLORS[registration.category].text,
                border: `2px solid ${TIER_COLORS[registration.category].border}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                boxShadow: `0 0 12px ${TIER_COLORS[registration.category].glow}`
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: TIER_COLORS[registration.category].border,
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}></span>
                {registration.category}
              </div>
            </div>
          )}

          {/* Team Badge */}
          {registration.team_name && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                border: '2px solid #4f46e5',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '700'
              }}>
                🏆 {registration.team_name}
              </div>
            </div>
          )}

          {/* Preferred Position */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Preferred Position
            </div>
            <div style={{
              display: 'inline-block',
              padding: '0.25rem 0.5rem',
              backgroundColor: registration.preferred_position === 'flank' ? '#dbeafe' : '#fef3c7',
              color: registration.preferred_position === 'flank' ? '#1e40af' : '#92400e',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              {registration.preferred_position === 'flank' ? 'Flank' : 'Pocket'}
            </div>
          </div>

          {/* Preferred Civs for Flank */}
          {registration.preferred_civs_flank && registration.preferred_civs_flank.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Flank Civs
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.25rem'
              }}>
                {registration.preferred_civs_flank.map((civ, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    {civ}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Civs for Pocket */}
          {registration.preferred_civs_pocket && registration.preferred_civs_pocket.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Pocket Civs
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.25rem'
              }}>
                {registration.preferred_civs_pocket.map((civ, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    {civ}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Maps */}
          {registration.preferred_maps && registration.preferred_maps.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Preferred Maps
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.25rem'
              }}>
                {registration.preferred_maps.map((map, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    {map}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {registration.notes && (
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Notes
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#374151',
                lineHeight: '1.4'
              }}>
                {registration.notes}
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
