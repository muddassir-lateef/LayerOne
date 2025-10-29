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
import CaptainRanking from './pages/CaptainRanking';
import DraftRoom from './pages/DraftRoom';
import TeamManagement from './pages/TeamManagement';
import BracketView from './pages/BracketView';
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
          
          <Route 
            path="/tournaments/:id/captains" 
            element={
              <ProtectedRoute>
                <CaptainRanking />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tournaments/:id/draft" 
            element={
              <ProtectedRoute>
                <DraftRoom />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tournaments/:id/teams" 
            element={
              <ProtectedRoute>
                <TeamManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tournaments/:id/bracket" 
            element={
              <ProtectedRoute>
                <BracketView />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
