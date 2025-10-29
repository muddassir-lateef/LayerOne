/**
 * Profile Page
 * 
 * Displays the logged-in user's Discord profile information.
 * Shows username, avatar, and provides a navigation and sign-out options.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navigation } from '../components/Navigation';
import './Profile.css';

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get Discord user metadata
  const discordUsername = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Unknown User';
  const discordAvatar = user?.user_metadata?.avatar_url;

  return (
    <>
      <Navigation />
      <div className="profile-container">
        <div className="profile-card">
          <h1>Profile</h1>
          
          <div className="profile-info">
            {discordAvatar && (
              <img 
                src={discordAvatar} 
                alt={`${discordUsername}'s avatar`}
                className="profile-avatar"
              />
            )}
            
            <h2 className="profile-username">{discordUsername}</h2>
            
            <div className="profile-details">
              <p className="detail-label">Discord ID</p>
              <p className="detail-value">{user?.id}</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn-back"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </>
  );
}
