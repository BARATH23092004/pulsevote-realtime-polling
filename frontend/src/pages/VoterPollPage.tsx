import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Share2,
  Clock,
  ArrowLeft,
  BarChart2,
  Vote as VoteIcon,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Radio
} from 'lucide-react';
import { pollService } from '../services/poll.service';
import type { Poll, PollResultsResponse, VoteBroadcastEvent } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../context/ToastContext';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { VoteForm } from '../components/polls/VoteForm';
import { LiveResultsChart } from '../components/polls/LiveResultsChart';
import { VoteBlastModal } from '../components/polls/VoteBlastModal';
import { ShareModal } from '../components/polls/ShareModal';
import { Skeleton } from '../components/common/Skeleton';

export const VoterPollPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResultsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'vote' | 'results'>('vote');
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);

  // Celebratory Blast Pop-up State
  const [blastModalOpen, setBlastModalOpen] = useState<boolean>(false);
  const [votedOptionText, setVotedOptionText] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    const votedStorageKey = `pulsevote_voted_${id}`;
    if (localStorage.getItem(votedStorageKey)) {
      setHasVoted(true);
      setViewMode('results');
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
        setPoll(pollRes.data);
      }
      if (resultsRes.success && resultsRes.data) {
        setResults(resultsRes.data);
      }
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '60px 0' }} className="container">
          <div className="glass-card" style={{ padding: '36px', maxWidth: '680px', margin: '0 auto' }}>
            <Skeleton height="32px" width="70%" style={{ marginBottom: '16px' }} />
            <Skeleton height="20px" width="40%" style={{ marginBottom: '32px' }} />
            <Skeleton height="60px" style={{ marginBottom: '14px' }} />
            <Skeleton height="60px" style={{ marginBottom: '14px' }} />
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
              The poll link you opened may be invalid or voting has ended.
            </p>
            <Link
              to="/"
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                color: 'white',
                fontWeight: 600,
                display: 'inline-block',
              }}
            >
              Return Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isClosed = poll.status === 'closed';
  const isExpired = results.isExpired;
  const isInactive = isClosed || isExpired;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '36px 0' }}>
        <div className="container" style={{ maxWidth: '680px' }}>
          
          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Link
              to="/"
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
              Home
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="live-indicator" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                <span className="live-dot" />
                <span>Live Audience</span>
              </div>

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

          {/* Voter Card */}
          <div className="glass-card" style={{ padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
            
            {/* Poll Status & Creator Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    backgroundColor: isInactive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: isInactive ? 'var(--accent-danger)' : 'var(--accent-success)',
                    border: isInactive ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  {isClosed ? 'Poll Closed' : isExpired ? 'Expired' : 'Active'}
                </span>

                {poll.creatorName && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Created by <strong>{poll.creatorName}</strong>
                  </span>
                )}
              </div>

              {poll.expiresAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Clock size={14} />
                  <span>{isExpired ? 'Ended' : `Closes ${new Date(poll.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</span>
                </div>
              )}
            </div>

            {/* Question Heading */}
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px', lineHeight: 1.25 }}>
              {poll.question}
            </h1>

            {/* Voter View Tabs: Cast Vote vs Live Results */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '26px',
                paddingBottom: '14px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <button
                onClick={() => setViewMode('vote')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  backgroundColor: viewMode === 'vote' ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: viewMode === 'vote' ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <VoteIcon size={16} />
                Cast Vote
              </button>

              <button
                onClick={() => setViewMode('results')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  backgroundColor: viewMode === 'results' ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: viewMode === 'results' ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <BarChart2 size={16} />
                Live Results
              </button>
            </div>

            {/* Voting Interface or Live Results */}
            {viewMode === 'vote' ? (
              <VoteForm
                poll={poll}
                onVote={handleVoteSubmit}
                hasVoted={hasVoted}
                isExpired={isExpired}
              />
            ) : (
              <LiveResultsChart
                results={results}
                connectionState={connectionState}
              />
            )}

            {/* Device Protection Note */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>{poll.allowDuplicateVotes ? 'Multiple votes permitted' : 'Protected: Single vote per participant device'}</span>
            </div>

          </div>

        </div>
      </main>

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={shareModalOpen}
        pollId={id || ''}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Vote Success Blast Modal */}
      <VoteBlastModal
        isOpen={blastModalOpen}
        selectedOptionText={votedOptionText}
        onClose={() => {
          setBlastModalOpen(false);
          setViewMode('results');
        }}
        onViewResults={() => {
          setBlastModalOpen(false);
          setViewMode('results');
        }}
      />

      <Footer />
    </div>
  );
};
