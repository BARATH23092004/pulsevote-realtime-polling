import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { pollService } from '../services/poll.service';
import type { Poll, PollStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Skeleton } from '../components/common/Skeleton';

export const EditPollPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<PollStatus>('active');
  const [allowDuplicateVotes, setAllowDuplicateVotes] = useState(false);
  const [enableExpiration, setEnableExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchPoll = async () => {
      try {
        const res = await pollService.getPoll(id);
        if (res.success && res.data) {
          setPoll(res.data);
          setQuestion(res.data.question);
          setStatus(res.data.status);
          setAllowDuplicateVotes(res.data.allowDuplicateVotes);
          if (res.data.expiresAt) {
            setEnableExpiration(true);
            const d = new Date(res.data.expiresAt);
            setExpiresAt(d.toISOString().slice(0, 16));
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load poll details', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await pollService.updatePoll(id, {
        question,
        status,
        allowDuplicateVotes,
        expiresAt: enableExpiration && expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      if (res.success) {
        showToast('Poll updated successfully!', 'success');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update poll.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '40px 0' }}>
        <div className="container" style={{ maxWidth: '680px' }}>
          
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              marginBottom: '24px'
            }}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          {loading ? (
            <Skeleton height="300px" />
          ) : !poll ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <h3>Poll Not Found</h3>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Edit Poll Settings
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '28px' }}>
                Update status, voting duplicate restrictions, or question details.
              </p>

              {errorMsg && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--accent-danger)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  marginBottom: '20px'
                }}>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Poll Question
                  </label>
                  <input
                    type="text"
                    required
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Poll Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as PollStatus)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem'
                    }}
                  >
                    <option value="active">Active (Accepting Votes)</option>
                    <option value="closed">Closed (Voting Disabled)</option>
                  </select>
                </div>

                <div style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={allowDuplicateVotes}
                      onChange={e => setAllowDuplicateVotes(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                    />
                    <span>Allow multiple votes per participant</span>
                  </label>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: enableExpiration ? '12px' : 0 }}>
                      <input
                        type="checkbox"
                        checked={enableExpiration}
                        onChange={e => setEnableExpiration(e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                      />
                      <span>Set Expiration Date</span>
                    </label>

                    {enableExpiration && (
                      <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={e => setExpiresAt(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem'
                        }}
                      />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-gradient)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Save size={18} />
                  {isSubmitting ? 'Saving Changes...' : 'Save Poll Settings'}
                </button>

              </form>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};
