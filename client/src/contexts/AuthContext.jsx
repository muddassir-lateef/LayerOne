/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Handles user session management and Discord OAuth login/logout.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Create the auth context
const AuthContext = createContext({});

/**
 * AuthProvider Component
 * Wraps the app and provides authentication state to all children
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign in with Discord OAuth
   * Redirects to Discord for authentication
   */
  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('Error signing in with Discord:', error.message);
      throw error;
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithDiscord,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use the auth context
 * Must be used within an AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
