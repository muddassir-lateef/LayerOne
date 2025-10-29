import { useState, useEffect } from 'react';
import { 
  createScheduleProposal, 
  getMatchProposals, 
  respondToProposal, 
  counterPropose,
  adminSetSchedule,
  isMatchCaptain 
} from '../services/scheduleService';
import { supabase } from '../lib/supabase';
import './ScheduleMatchModal.css';

function ScheduleMatchModal({ match, onClose, onScheduled, isAdmin }) {
  const [proposals, setProposals] = useState([]);
  const [proposedTime, setProposedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isCaptain, setIsCaptain] = useState(false);

  useEffect(() => {
    checkUser();
    loadProposals();
  }, [match.id]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user && !isAdmin) {
      const captainStatus = await isMatchCaptain(match.id, user.id);
      setIsCaptain(captainStatus);
    }
  };

  const loadProposals = async () => {
    try {
      const data = await getMatchProposals(match.id);
      setProposals(data || []);
    } catch (error) {
      console.error('Error loading proposals:', error);
      // If table doesn't exist yet (schema not deployed), just show empty proposals
      if (error.message?.includes('relation') || error.code === '42P01') {
        console.warn('Schedule proposals table not yet created. Please deploy matches_schema_v2.sql');
        setProposals([]);
      } else {
        alert('Failed to load proposals: ' + error.message);
      }
    }
  };

  const handleProposeTime = async (e) => {
    e.preventDefault();
    if (!proposedTime) return;

    // Check if there's already a pending proposal from this user
    const userPendingProposal = proposals.find(
      p => p.proposed_by === user?.id && p.status === 'pending'
    );
    
    if (userPendingProposal) {
      alert('You already have a pending proposal for this match. Please wait for a response or withdraw your previous proposal.');
      return;
    }

    setLoading(true);
    try {
      await createScheduleProposal(match.id, proposedTime, notes);
      setProposedTime('');
      setNotes('');
      loadProposals();
      alert('Schedule proposal submitted!');
    } catch (error) {
      console.error('Error creating proposal:', error);
      alert('Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSchedule = async (e) => {
    e.preventDefault();
    if (!proposedTime) return;

    setLoading(true);
    try {
      await adminSetSchedule(match.id, proposedTime);
      alert('Match scheduled successfully!');
      onScheduled();
      onClose();
    } catch (error) {
      console.error('Error scheduling match:', error);
      alert('Failed to schedule match');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (proposalId) => {
    if (!confirm('Approve this schedule proposal?')) return;

    setLoading(true);
    try {
      await respondToProposal(proposalId, 'approved');
      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      alert('Schedule approved!');
      if (onScheduled) await onScheduled(); // Wait for refresh
      if (onClose) onClose(); // Close modal
    } catch (error) {
      console.error('Error approving proposal:', error);
      alert('Failed to approve proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (proposalId) => {
    const reason = prompt('Reason for rejection (optional):');
    
    setLoading(true);
    try {
      await respondToProposal(proposalId, 'rejected', reason);
      loadProposals();
      alert('Proposal rejected');
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      alert('Failed to reject proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleCounterPropose = async (proposalId) => {
    const newTime = prompt('Enter new proposed time (YYYY-MM-DD HH:MM):');
    if (!newTime) return;

    const reason = prompt('Reason for counter-proposal (optional):');

    setLoading(true);
    try {
      await counterPropose(proposalId, match.id, newTime, reason);
      loadProposals();
      alert('Counter-proposal submitted!');
    } catch (error) {
      console.error('Error creating counter-proposal:', error);
      alert('Failed to create counter-proposal');
    } finally {
      setLoading(false);
    }
  };

  const getProposerName = (proposal) => {
    // Check if we have proposer data from registrations
    if (proposal.proposer?.discord_username) {
      return proposal.proposer.discord_username;
    }
    // Check if it's the current user
    if (user && proposal.proposed_by === user.id) {
      return 'You';
    }
    // Fallback: Show truncated user ID
    return `User ${proposal.proposed_by.substring(0, 8)}...`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pending', class: 'status-pending' },
      approved: { label: 'Approved', class: 'status-approved' },
      rejected: { label: 'Rejected', class: 'status-rejected' },
      countered: { label: 'Countered', class: 'status-countered' },
      expired: { label: 'Expired', class: 'status-expired' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`status-badge ${badge.class}`}>{badge.label}</span>;
  };

  // Set minimum datetime to current time
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Schedule Match</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="match-info">
          <div className="match-teams">
            <div className="team">
              {match.team1?.logo_url && (
                <img src={match.team1.logo_url} alt={match.team1.name} className="team-logo-small" />
              )}
              <span>{match.team1?.name || 'TBD'}</span>
            </div>
            <span className="vs">VS</span>
            <div className="team">
              {match.team2?.logo_url && (
                <img src={match.team2.logo_url} alt={match.team2.name} className="team-logo-small" />
              )}
              <span>{match.team2?.name || 'TBD'}</span>
            </div>
          </div>
          <div className="match-details">
            <span className="match-phase">{match.phase.replace('_', ' ')}</span>
            <span className="match-format">Best of {match.best_of}</span>
          </div>
        </div>

        {/* Admin Direct Schedule */}
        {isAdmin && (
          <div className="admin-schedule-section">
            <h3>🔧 Admin: Set Schedule Directly</h3>
            <form onSubmit={handleAdminSchedule}>
              <div className="form-group">
                <label>Match Date & Time</label>
                <input
                  type="datetime-local"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  min={getMinDateTime()}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Scheduling...' : 'Set Schedule (Admin Override)'}
              </button>
            </form>
          </div>
        )}

        {/* Captain Propose Schedule */}
        {isCaptain && !isAdmin && (
          <div className="propose-section">
            <h3>Propose Schedule</h3>
            <form onSubmit={handleProposeTime}>
              <div className="form-group">
                <label>Proposed Date & Time</label>
                <input
                  type="datetime-local"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  min={getMinDateTime()}
                  required
                />
              </div>
              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                  rows="3"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Submitting...' : 'Propose Schedule'}
              </button>
            </form>
          </div>
        )}

        {/* Existing Proposals */}
        <div className="proposals-section">
          <h3>Schedule Proposals</h3>
          {proposals.length === 0 ? (
            <p className="no-proposals">No proposals yet. Be the first to propose a schedule!</p>
          ) : (
            <div className="proposals-list">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="proposal-card">
                  <div className="proposal-header">
                    <div className="proposal-info">
                      <strong>{getProposerName(proposal)}</strong>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <div className="proposal-time">
                      {new Date(proposal.proposed_time).toLocaleString()}
                    </div>
                  </div>
                  
                  {proposal.response_notes && (
                    <div className="proposal-notes">
                      <strong>Notes:</strong> {proposal.response_notes}
                    </div>
                  )}

                  {/* Actions for pending proposals */}
                  {proposal.status === 'pending' && isCaptain && proposal.proposed_by !== user?.id && (
                    <div className="proposal-actions">
                      <button 
                        onClick={() => handleApprove(proposal.id)}
                        disabled={loading}
                        className="btn-approve"
                      >
                        ✓ Approve
                      </button>
                      <button 
                        onClick={() => handleCounterPropose(proposal.id)}
                        disabled={loading}
                        className="btn-counter"
                      >
                        ⟳ Counter-Propose
                      </button>
                      <button 
                        onClick={() => handleReject(proposal.id)}
                        disabled={loading}
                        className="btn-reject"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}

                  {/* Admin can approve any proposal */}
                  {proposal.status === 'pending' && isAdmin && (
                    <div className="proposal-actions">
                      <button 
                        onClick={() => handleApprove(proposal.id)}
                        disabled={loading}
                        className="btn-approve"
                      >
                        ✓ Admin Approve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!isCaptain && !isAdmin && (
          <p className="info-message">
            Only team captains and tournament admins can propose or approve schedules.
          </p>
        )}
      </div>
    </div>
  );
}

export default ScheduleMatchModal;
