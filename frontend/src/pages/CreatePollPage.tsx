import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, HelpCircle, ArrowLeft, Settings } from 'lucide-react';
import { pollService } from '../services/poll.service';
import { useToast } from '../context/ToastContext';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { ShareModal } from '../components/polls/ShareModal';

export const CreatePollPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowDuplicateVotes, setAllowDuplicateVotes] = useState(false);
  const [anonymousVoting, setAnonymousVoting] = useState(true);
  const [enableExpiration, setEnableExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPollId, setCreatedPollId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddOption = () => {
    if (options.length >= 10) {
      showToast('Maximum 10 options allowed', 'info');
      return;
    }
    setOptions(prev => [...prev, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      showToast('At least 2 options are required', 'info');
      return;
    }
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || trimmedQuestion.length < 5) {
      setErrorMsg('Question must be at least 5 characters long.');
      return;
    }

    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      setErrorMsg('Please provide at least 2 non-empty options.');
      return;
    }

    const uniqueOptions = new Set(validOptions.map(o => o.toLowerCase()));
    if (uniqueOptions.size !== validOptions.length) {
      setErrorMsg('Duplicate options are not allowed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await pollService.createPoll({
        question: trimmedQuestion,
        options: validOptions,
        allowDuplicateVotes,
        anonymousVoting,
        expiresAt: enableExpiration && expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      if (res.success && res.data) {
        showToast('Poll created successfully!', 'success');
        setCreatedPollId(res.data.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create poll.');
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
            onClick={() => navigate(-1)}
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
            Back
          </button>

          <div className="glass-card" style={{ padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Create a New Poll
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '28px' }}>
              Ask a question, add customizable options, and configure voting security.
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
              
              {/* Poll Question */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Poll Question *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Which frontend framework do you prefer for production?"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                />
              </div>

              {/* Dynamic Options */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Poll Options (Min 2, Max 10) *
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
                  {options.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={e => handleOptionChange(idx, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          fontSize: '0.95rem'
                        }}
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          style={{ color: 'var(--accent-danger)', padding: '8px' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {options.length < 10 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                  >
                    <Plus size={18} />
                    Add Option
                  </button>
                )}
              </div>

              {/* Settings Box */}
              <div style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  <Settings size={18} />
                  Poll Configuration
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={allowDuplicateVotes}
                    onChange={e => setAllowDuplicateVotes(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                  />
                  <span>Allow multiple votes per participant (disable single vote restriction)</span>
                </label>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: enableExpiration ? '12px' : 0 }}>
                    <input
                      type="checkbox"
                      checked={enableExpiration}
                      onChange={e => setEnableExpiration(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                    />
                    <span>Set Poll Expiration Date & Time</span>
                  </label>

                  {enableExpiration && (
                    <input
                      type="datetime-local"
                      required
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

              {/* Submit Button */}
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
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                {isSubmitting ? 'Creating Poll...' : 'Publish Poll & Get Link'}
              </button>

            </form>
          </div>
        </div>
      </main>

      {/* Share Modal after creation */}
      <ShareModal
        isOpen={!!createdPollId}
        pollId={createdPollId || ''}
        onClose={() => {
          setCreatedPollId(null);
          navigate('/dashboard');
        }}
      />

      <Footer />
    </div>
  );
};
