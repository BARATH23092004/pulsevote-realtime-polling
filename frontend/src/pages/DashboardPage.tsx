import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Share2,
  Edit2,
  Lock,
  Trash2,
  BarChart2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Calendar,
  Layers
} from 'lucide-react';
import { pollService } from '../services/poll.service';
import type { Poll, DashboardStats } from '../types';
import { useToast } from '../context/ToastContext';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { ShareModal } from '../components/polls/ShareModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Skeleton } from '../components/common/Skeleton';

export const DashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');

  // Modals state
  const [sharePollId, setSharePollId] = useState<string | null>(null);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const statsRes = await pollService.getDashboardStats();
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
        setPolls(statsRes.data.recentPolls || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleClosePoll = async () => {
    if (!confirmCloseId) return;
    try {
      const res = await pollService.closePoll(confirmCloseId);
      if (res.success) {
        showToast('Poll closed successfully', 'success');
        fetchDashboard();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to close poll', 'error');
    } finally {
      setConfirmCloseId(null);
    }
  };

  const handleDeletePoll = async () => {
    if (!confirmDeleteId) return;
    try {
      const res = await pollService.deletePoll(confirmDeleteId);
      if (res.success) {
        showToast('Poll deleted successfully', 'success');
        fetchDashboard();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete poll', 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Filter logic
  const filteredPolls = polls.filter(poll => {
    const matchesSearch = poll.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && poll.status === 'active') ||
      (statusFilter === 'closed' && poll.status === 'closed');
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '40px 0' }}>
        <div className="container">
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Creator Dashboard</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
                Manage your real-time polls, share links, and track live analytics
              </p>
            </div>

            <Link
              to="/create-poll"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                color: 'white',
                fontWeight: 700,
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <Plus size={20} />
              Create New Poll
            </Link>
          </div>

          {/* Stats Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Total Polls</span>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
                  <Layers size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {loading ? <Skeleton width="60px" height="36px" /> : stats?.totalPolls || 0}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Total Votes</span>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
                  <BarChart2 size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {loading ? <Skeleton width="60px" height="36px" /> : stats?.totalVotes || 0}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Active Polls</span>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)' }}>
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {loading ? <Skeleton width="60px" height="36px" /> : stats?.activePolls || 0}
              </div>
            </div>

          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            
            <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search polls by question..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 42px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              {(['all', 'active', 'closed'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setStatusFilter(type)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    backgroundColor: statusFilter === type ? 'var(--accent-primary)' : 'transparent',
                    color: statusFilter === type ? 'white' : 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

          </div>

          {/* Polls List / Table */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Skeleton height="80px" />
              <Skeleton height="80px" />
              <Skeleton height="80px" />
            </div>
          ) : filteredPolls.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>No Polls Found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
                {searchQuery || statusFilter !== 'all'
                  ? 'No polls match your search query or filter criteria.'
                  : 'You have not created any polls yet. Create your first poll to get started!'}
              </p>
              <Link
                to="/create-poll"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  fontWeight: 600
                }}
              >
                Create First Poll
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredPolls.map(poll => {
                const isClosed = poll.status === 'closed';
                const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();

                return (
                  <div key={poll.id} className="glass-card" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <span
                            style={{
                              padding: '2px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: isClosed || isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: isClosed || isExpired ? 'var(--accent-danger)' : 'var(--accent-success)',
                              border: isClosed || isExpired ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            {isClosed ? 'Closed' : isExpired ? 'Expired' : 'Active'}
                          </span>

                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} />
                            {new Date(poll.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                          <Link
                            to={`/poll/${poll.id}`}
                            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}
                          >
                            {poll.question}
                          </Link>
                        </h3>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span>{poll.options.length} Options</span>
                          <span>•</span>
                          <span>{poll.allowDuplicateVotes ? 'Multiple votes allowed' : 'Single vote per device'}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        
                        <Link
                          to={`/poll/${poll.id}`}
                          title="View Live Poll & Analytics Feed"
                          style={{
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Eye size={16} />
                          View & Analyze
                        </Link>

                        <button
                          onClick={() => setSharePollId(poll.id)}
                          title="Share Link"
                          style={{
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            color: 'var(--accent-primary)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Share2 size={16} />
                          Share
                        </button>

                        <Link
                          to={`/edit-poll/${poll.id}`}
                          title="Edit Poll"
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Edit2 size={16} />
                        </Link>

                        {!isClosed && (
                          <button
                            onClick={() => setConfirmCloseId(poll.id)}
                            title="Close Voting"
                            style={{
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              color: 'var(--accent-warning)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Lock size={16} />
                          </button>
                        )}

                        <button
                          onClick={() => setConfirmDeleteId(poll.id)}
                          title="Delete Poll"
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--accent-danger)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* Share Modal */}
      <ShareModal
        isOpen={!!sharePollId}
        pollId={sharePollId || ''}
        onClose={() => setSharePollId(null)}
      />

      {/* Confirm Close Modal */}
      <ConfirmModal
        isOpen={!!confirmCloseId}
        title="Close Poll Voting?"
        message="Closing this poll will prevent audience members from submitting any new votes. Results will remain viewable."
        confirmText="Close Voting"
        onConfirm={handleClosePoll}
        onCancel={() => setConfirmCloseId(null)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Delete Poll Permanently?"
        message="Are you sure you want to delete this poll? This action cannot be undone and will erase all recorded vote data."
        confirmText="Delete Poll"
        isDanger={true}
        onConfirm={handleDeletePoll}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <Footer />
    </div>
  );
};
