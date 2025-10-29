/**
 * Main App Component
 * 
 * Sets up routing and authentication context for the application.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Dashboard } from './pages/Dashboard';
import { CreateTournament } from './pages/CreateTournament';
import { TournamentDetail } from './pages/TournamentDetail';
import { TournamentRegistration } from './pages/TournamentRegistration';
import PlayerCategories from './pages/PlayerCategories';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route - Login page */}
          <Route path="/" element={<Login />} />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tournaments/create" 
            element={
              <ProtectedRoute>
                <CreateTournament />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tournaments/:id" 
            element={
              <ProtectedRoute>
                <TournamentDetail />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tournaments/:id/register" 
            element={
              <ProtectedRoute>
                <TournamentRegistration />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tournaments/:id/categories" 
            element={
              <ProtectedRoute>
                <PlayerCategories />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
