/**
 * Navigation Component
 * 
 * Top navigation bar for authenticated users.
 * Shows user profile and navigation links.
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

export function Navigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const discordUsername = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
  const discordAvatar = user?.user_metadata?.avatar_url;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        {/* Logo/Brand */}
        <Link to="/dashboard" className="nav-brand">
          <svg className="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span>AoE2 Tournaments</span>
        </Link>

        {/* Navigation Links */}
        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">
            Tournaments
          </Link>
        </div>

        {/* User Menu */}
        <div className="nav-user">
          <Link to="/profile" className="user-profile-link">
            {discordAvatar && (
              <img 
                src={discordAvatar} 
                alt={discordUsername}
                className="user-avatar-small"
              />
            )}
            <span className="user-name">{discordUsername}</span>
          </Link>
          
          <button onClick={handleSignOut} className="btn-signout-nav">
            <svg className="signout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
