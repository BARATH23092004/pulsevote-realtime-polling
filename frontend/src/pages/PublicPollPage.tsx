import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Share2,
  Clock,
  CheckCircle2,
  Lock,
  ArrowLeft,
  BarChart2,
  Vote as VoteIcon,
  Edit3,
  Copy,
  Check,
  Trophy,
  Activity,
  Layers,
  ShieldCheck,
  Calendar,
  Save,
  AlertCircle,
  ExternalLink,
  QrCode,
  Unlock,
  Radio,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { pollService } from '../services/poll.service';
import type { Poll, PollResultsResponse, VoteBroadcastEvent, PollStatus } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { VoteForm } from '../components/polls/VoteForm';
import { LiveResultsChart } from '../components/polls/LiveResultsChart';
import { LiveFeed, type FeedItem } from '../components/polls/LiveFeed';
import { ShareModal } from '../components/polls/ShareModal';
import { VoteBlastModal } from '../components/polls/VoteBlastModal';
import { Skeleton } from '../components/common/Skeleton';

type TabType = 'analysis' | 'vote' | 'edit' | 'share';

export const PublicPollPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResultsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Celebratory Blast Pop-up State
  const [blastModalOpen, setBlastModalOpen] = useState<boolean>(false);
  const [votedOptionText, setVotedOptionText] = useState<string>('');

  // Live Activity Feed State
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  // Inline Edit Form State
  const [editQuestion, setEditQuestion] = useState('');
  const [editStatus, setEditStatus] = useState<PollStatus>('active');
  const [editAllowDuplicateVotes, setEditAllowDuplicateVotes] = useState(false);
  const [editEnableExpiration, setEditEnableExpiration] = useState(false);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // IAM Policy check: Verify if current caller is creator or system administrator
  const isCreator = useMemo(() => {
    if (!poll || !user) return false;
    return user.role === 'admin' || poll.creatorId === user.id || poll.creatorName === user.name;
  }, [poll, user]);

  useEffect(() => {
    if (!id) return;
    const votedStorageKey = `pulsevote_voted_${id}`;
    if (localStorage.getItem(votedStorageKey)) {
      setHasVoted(true);
      setActiveTab('analysis');
    }
  }, [id]);

  const fetchPollData = useCallback(async () => {
    if (!id) return;
    try {
      const [pollRes, resultsRes] = await Promise.all([
        pollService.getPoll(id),
        pollService.getPollResults(id),
      ]);

      if (pollRes.success && pollRes.data) {
        const p = pollRes.data;
        setPoll(p);
        setEditQuestion(p.question);
        setEditStatus(p.status);
        setEditAllowDuplicateVotes(p.allowDuplicateVotes);
        if (p.expiresAt) {
          setEditEnableExpiration(true);
          const d = new Date(p.expiresAt);
          setEditExpiresAt(d.toISOString().slice(0, 16));
        } else {
          setEditEnableExpiration(false);
          setEditExpiresAt('');
        }
      }
      if (resultsRes.success && resultsRes.data) {
        setResults(resultsRes.data);
      }

      // Initial feed event
      setFeedItems([
        {
          id: 'init_' + Date.now(),
          message: 'Real-time WebSocket feed initialized',
          subtext: 'Listening for live votes via Redis Pub/Sub',
          timestamp: new Date().toLocaleTimeString(),
          type: 'system',
        },
      ]);
    } catch (err: any) {
      showToast(err.message || 'Failed to load poll', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchPollData();
  }, [fetchPollData]);

  // Handle incoming real-time broadcast payload from Redis Pub/Sub & WebSockets
  const handleWebSocketMessage = useCallback((event: VoteBroadcastEvent) => {
    if (event && event.type === 'VOTE_UPDATED' && event.results) {
      setResults(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          totalVotes: event.totalVotes,
          options: event.results,
        };
      });

      // Add to live activity feed
      const timeStr = event.timestamp
        ? new Date(event.timestamp).toLocaleTimeString()
        : new Date().toLocaleTimeString();

      const newFeedItem: FeedItem = {
        id: 'vote_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        message: `New vote cast on poll!`,
        subtext: `Total votes updated to ${event.totalVotes}`,
        timestamp: timeStr,
        type: 'vote',
      };

      setFeedItems(prev => [newFeedItem, ...prev.slice(0, 24)]);
    }
  }, []);

  const { connectionState } = useWebSocket({
    pollId: id || '',
    onMessage: handleWebSocketMessage,
    enabled: !!id,
  });

  const handleVoteSubmit = async (optionId: string) => {
    if (!id) return;

    const chosenOption = poll?.options.find(o => o.id === optionId);
    setVotedOptionText(chosenOption ? chosenOption.text : 'Selected Option');

    try {
      const res = await pollService.castVote(id, optionId);
      if (res.success && res.data) {
        setResults(res.data);
        setHasVoted(true);

        if (poll && !poll.allowDuplicateVotes) {
          localStorage.setItem(`pulsevote_voted_${id}`, 'true');
        }

        // Trigger Pop-up Blast Screen Effect
        setBlastModalOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit vote', 'error');
    }
  };

  const handleCopyLink = () => {
    const voterUrl = `${window.location.origin}/vote/${id}`;
    navigator.clipboard.writeText(voterUrl);
    setCopiedLink(true);
    showToast('Audience Voting Link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSavingEdit(true);
    try {
      const res = await pollService.updatePoll(id, {
        question: editQuestion,
        status: editStatus,
        allowDuplicateVotes: editAllowDuplicateVotes,
        expiresAt: editEnableExpiration && editExpiresAt ? new Date(editExpiresAt).toISOString() : undefined,
      });

      if (res.success && res.data) {
        setPoll(res.data);
        if (results) {
          setResults({ ...results, question: res.data.question, status: res.data.status });
        }
        showToast('Poll updated successfully!', 'success');
        setActiveTab('analysis');

        // Append to feed
        setFeedItems(prev => [
          {
            id: 'edit_' + Date.now(),
            message: 'Poll details updated by creator',
            subtext: `Question: "${res.data.question}"`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'status',
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update poll', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleQuickToggleStatus = async () => {
    if (!id || !poll) return;
    setIsTogglingStatus(true);
    const newStatus: PollStatus = poll.status === 'active' ? 'closed' : 'active';

    try {
      const res = await pollService.updatePoll(id, {
        question: poll.question,
        status: newStatus,
        allowDuplicateVotes: poll.allowDuplicateVotes,
      });

      if (res.success && res.data) {
        setPoll(res.data);
        setEditStatus(res.data.status);
        if (results) {
          setResults({ ...results, status: res.data.status });
        }
        showToast(`Poll voting ${newStatus === 'active' ? 'reopened' : 'closed'}!`, 'success');

        setFeedItems(prev => [
          {
            id: 'status_' + Date.now(),
            message: `Voting ${newStatus === 'active' ? 'reopened' : 'closed'} by creator`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'status',
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to change poll status', 'error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '60px 0' }} className="container">
          <div className="glass-card" style={{ padding: '36px', maxWidth: '840px', margin: '0 auto' }}>
            <Skeleton height="32px" width="60%" style={{ marginBottom: '16px' }} />
            <Skeleton height="20px" width="35%" style={{ marginBottom: '32px' }} />
            <Skeleton height="160px" style={{ marginBottom: '24px' }} />
            <Skeleton height="50px" style={{ marginBottom: '12px' }} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!poll || !results) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '80px 0', textAlign: 'center' }} className="container">
          <div className="glass-card" style={{ padding: '50px 20px', maxWidth: '500px', margin: '0 auto' }}>
            <AlertCircle size={48} style={{ color: 'var(--accent-danger)', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px' }}>Poll Not Found</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              This poll may have been deleted, closed, or the link is incorrect.
            </p>
            <Link
              to={isAuthenticated ? '/dashboard' : '/'}
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                color: 'white',
                fontWeight: 600,
                display: 'inline-block',
              }}
            >
              {isAuthenticated ? 'Return to Dashboard' : 'Return Home'}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // IAM Policy Enforcement: Non-creators are restricted from analytics & editing controls
  if (!isCreator) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '80px 0', textAlign: 'center' }} className="container">
          <div className="glass-card" style={{ padding: '48px 32px', maxWidth: '560px', margin: '0 auto', boxShadow: 'var(--shadow-lg)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-danger)',
                margin: '0 auto 20px',
              }}
            >
              <ShieldAlert size={34} />
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              IAM Security Policy Restriction
            </div>

            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Creator Permissions Required
            </h2>

            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px', fontSize: '0.94rem' }}>
              Detailed analytics, live WebSocket feeds, and management controls for <strong>"{poll.question}"</strong> are restricted to the verified creator ({poll.creatorName || 'Owner'}).
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to={`/vote/${id}`}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <span>Go to Public Voting Screen</span>
                <ArrowRight size={16} />
              </Link>

              {!isAuthenticated && (
                <Link
                  to="/login"
                  style={{
                    padding: '12px 20px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                  }}
                >
                  Log In as Creator
                </Link>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isClosed = poll.status === 'closed';
  const isExpired = results.isExpired;
  const isInactive = isClosed || isExpired;
  const voterUrl = `${window.location.origin}/vote/${id}`;
  const analyticsUrl = `${window.location.origin}/poll/${id}`;
  const pollUrl = voterUrl;

  // Find winning option
  const leadingOption = results.options.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), results.options[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '36px 0' }}>
        <div className="container" style={{ maxWidth: '880px' }}>
          
          {/* Top Breadcrumb & Live Status Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <Link
              to={isAuthenticated ? '/dashboard' : '/'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              <ArrowLeft size={18} />
              {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="live-indicator" style={{ fontSize: '0.82rem', padding: '4px 10px' }}>
                <span className="live-dot" />
                <span>{connectionState === 'connected' ? 'Live Stream Active' : 'Connecting Stream...'}</span>
              </div>

              {isCreator && (
                <button
                  onClick={handleQuickToggleStatus}
                  disabled={isTogglingStatus}
                  title={isClosed ? 'Re-open Voting' : 'Close Voting'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    backgroundColor: isClosed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: isClosed ? 'var(--accent-success)' : 'var(--accent-warning)',
                    border: '1px solid currentColor',
                    cursor: 'pointer',
                  }}
                >
                  {isClosed ? <Unlock size={14} /> : <Lock size={14} />}
                  <span>{isClosed ? 'Re-open Poll' : 'Close Poll'}</span>
                </button>
              )}

              <button
                onClick={handleCopyLink}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {copiedLink ? <Check size={14} style={{ color: 'var(--accent-success)' }} /> : <Copy size={14} />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => setShareModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Poll Overview Header Card */}
          <div className="glass-card" style={{ padding: '28px 32px', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: isInactive ? 'var(--accent-danger)' : 'var(--accent-success)',
                      border: isInactive ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    {isClosed ? 'Poll Closed' : isExpired ? 'Expired' : 'Active'}
                  </span>

                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    Created {new Date(poll.createdAt).toLocaleDateString()}
                  </span>

                  {poll.creatorName && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      by <strong>{poll.creatorName}</strong>
                    </span>
                  )}

                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} style={{ color: 'var(--accent-primary)' }} />
                    {poll.allowDuplicateVotes ? 'Multiple votes allowed' : 'Single vote per device'}
                  </span>
                </div>

                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: '14px' }}>
                  {poll.question}
                </h1>

                {poll.expiresAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: isExpired ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                    <Clock size={14} />
                    <span>
                      {isExpired ? 'Voting concluded on ' : 'Voting closes on '}
                      {new Date(poll.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Total Votes Stat Badge */}
              <div
                style={{
                  padding: '16px 24px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                  minWidth: '130px',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Total Votes
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-primary)', lineHeight: 1 }}>
                  {results.totalVotes}
                </div>
              </div>
            </div>

            {/* Dual Link Display: Dedicated Audience Voting Link vs Creator Analytics Link */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '14px',
                marginTop: '20px',
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
              }}
            >
              {/* Audience Voting Link */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🔗 Audience Voting Link (Send this to others)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)', fontWeight: 700 }}>
                    Public Screen
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={voterUrl}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                    }}
                  />
                  <button
                    onClick={handleCopyLink}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: 'var(--accent-gradient)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={voterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open Audience Voting Screen in new tab"
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>

              {/* Creator Analytics Link */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    📊 Creator Analytics Hub (Private)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Creator Only
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={analyticsUrl}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      fontSize: '0.84rem',
                    }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(analyticsUrl);
                      showToast('Creator Analytics link copied!', 'success');
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => setActiveTab('analysis')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  backgroundColor: activeTab === 'analysis' ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: activeTab === 'analysis' ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <BarChart2 size={16} />
                Live Analysis & Feed
              </button>

              <button
                onClick={() => setActiveTab('vote')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  backgroundColor: activeTab === 'vote' ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: activeTab === 'vote' ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <VoteIcon size={16} />
                Cast Vote
              </button>

              {/* Edit Tab (Visible to creator or logged in user) */}
              {isAuthenticated && (
                <button
                  onClick={() => setActiveTab('edit')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    backgroundColor: activeTab === 'edit' ? 'var(--accent-primary)' : 'var(--bg-input)',
                    color: activeTab === 'edit' ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Edit3 size={16} />
                  Edit Poll
                </button>
              )}

              <button
                onClick={() => setActiveTab('share')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  backgroundColor: activeTab === 'share' ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: activeTab === 'share' ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Share2 size={16} />
                Share & QR
              </button>
            </div>
          </div>

          {/* TAB CONTENT: 1. Live Analysis & Feed */}
          {activeTab === 'analysis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Analytics KPI Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    Leading Option
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {results.totalVotes > 0 && leadingOption ? (
                      <>
                        <Trophy size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {leadingOption.text}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No votes yet</span>
                    )}
                  </div>
                  {results.totalVotes > 0 && leadingOption && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 700, marginTop: '4px' }}>
                      {leadingOption.percentage.toFixed(1)}% of total votes
                    </div>
                  )}
                </div>

                <div className="glass-card" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    Total Options
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {poll.options.length} Options
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Available for participants
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    Live Engine Status
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-success)' }}>
                    <Radio size={16} />
                    <span>Real-Time</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    WebSocket & Redis Pub/Sub
                  </div>
                </div>
              </div>

              {/* Live Results Bar Chart Card */}
              <div className="glass-card" style={{ padding: '28px 32px', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Real-Time Vote Distribution
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                      Instant updates broadcasted live with zero page refreshes
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('vote')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--accent-primary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <VoteIcon size={16} />
                    Submit a Vote
                  </button>
                </div>

                <LiveResultsChart results={results} connectionState={connectionState} />

                {/* Real-time Activity Feed / Ticker */}
                <LiveFeed items={feedItems} connectionState={connectionState} />
              </div>

            </div>
          )}

          {/* TAB CONTENT: 2. Cast Vote */}
          {activeTab === 'vote' && (
            <div className="glass-card" style={{ padding: '36px', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Participate & Cast Your Vote
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Select your choice below. Your vote will immediately stream to all connected screens.
                </p>
              </div>

              <VoteForm
                poll={poll}
                onVote={handleVoteSubmit}
                hasVoted={hasVoted}
                isExpired={isExpired}
              />
            </div>
          )}

          {/* TAB CONTENT: 3. Edit Poll Details */}
          {activeTab === 'edit' && isAuthenticated && (
            <div className="glass-card" style={{ padding: '36px', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Edit Poll Details & Settings
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Modify the question, update active voting status, or adjust expiration settings.
                </p>
              </div>

              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Poll Question
                  </label>
                  <input
                    type="text"
                    required
                    value={editQuestion}
                    onChange={e => setEditQuestion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Poll Voting Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as PollStatus)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                    }}
                  >
                    <option value="active">Active (Accepting votes from audience)</option>
                    <option value="closed">Closed (Voting disabled; results remain viewable)</option>
                  </select>
                </div>

                <div
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={editAllowDuplicateVotes}
                      onChange={e => setEditAllowDuplicateVotes(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                    />
                    <span>Allow multiple votes per participant</span>
                  </label>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: editEnableExpiration ? '12px' : 0 }}>
                      <input
                        type="checkbox"
                        checked={editEnableExpiration}
                        onChange={e => setEditEnableExpiration(e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                      />
                      <span>Set Expiration Date & Time</span>
                    </label>

                    {editEnableExpiration && (
                      <input
                        type="datetime-local"
                        value={editExpiresAt}
                        onChange={e => setEditExpiresAt(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                        }}
                      />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-gradient)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1rem',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Save size={18} />
                  {isSavingEdit ? 'Saving Changes...' : 'Save Poll Changes'}
                </button>
              </form>
            </div>
          )}

          {/* TAB CONTENT: 4. Share & QR Preview */}
          {activeTab === 'share' && (
            <div className="glass-card" style={{ padding: '36px', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Share Your Poll Link & QR Code
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Invite your audience to vote live across mobile phones, laptops, and tablets.
                </p>
              </div>

              {/* QR Code Container */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'white',
                  border: '1px solid var(--border-color)',
                  maxWidth: '240px',
                  margin: '0 auto 24px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pollUrl)}`}
                  alt="Poll QR Code"
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
                <div style={{ marginTop: '12px', fontSize: '0.78rem', fontWeight: 700, color: '#111827' }}>
                  Scan to Vote Live
                </div>
              </div>

              {/* Copy URL Input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  maxWidth: '560px',
                  margin: '0 auto 24px',
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={pollUrl}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: copiedLink ? 'var(--accent-success)' : 'var(--accent-primary)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Social Share Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Vote in this live poll: "${poll.question}" on PulseVote: ${pollUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(37, 211, 102, 0.1)',
                    color: '#25D366',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  WhatsApp
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Vote now: "${poll.question}"`)}&url=${encodeURIComponent(pollUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(29, 155, 240, 0.1)',
                    color: '#1d9bf0',
                    border: '1px solid rgba(29, 155, 240, 0.3)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Twitter / X
                </a>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(pollUrl)}&text=${encodeURIComponent(poll.question)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(0, 136, 204, 0.1)',
                    color: '#0088cc',
                    border: '1px solid rgba(0, 136, 204, 0.3)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Telegram
                </a>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={shareModalOpen}
        pollId={id || ''}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Pop-up Blast Screen Effect Modal */}
      <VoteBlastModal
        isOpen={blastModalOpen}
        selectedOptionText={votedOptionText}
        onClose={() => {
          setBlastModalOpen(false);
          setActiveTab('analysis');
        }}
        onViewResults={() => {
          setBlastModalOpen(false);
          setActiveTab('analysis');
        }}
      />

      <Footer />
    </div>
  );
};
