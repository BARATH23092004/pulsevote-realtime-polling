import React, { useState } from 'react';
import { CheckCircle2, Lock, Sparkles, Send, Check } from 'lucide-react';
import type { Poll } from '../../types';

interface VoteFormProps {
  poll: Poll;
  onVote: (optionId: string) => Promise<void>;
  hasVoted: boolean;
  isExpired: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const VoteForm: React.FC<VoteFormProps> = ({ poll, onVote, hasVoted, isExpired }) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isDisabled = hasVoted || isExpired || poll.status === 'closed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId) {
      setErrorMsg('Please choose an option to cast your vote.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onVote(selectedOptionId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit vote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {errorMsg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--accent-danger)',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {errorMsg}
        </div>
      )}

      {isDisabled && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: 'var(--accent-warning)',
            fontSize: '0.92rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Lock size={20} />
          <span>{hasVoted ? 'You have already voted on this poll.' : 'Voting is closed for this poll.'}</span>
        </div>
      )}

      {/* Modern Poll Options Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {poll.options.map((option, index) => {
          const isSelected = selectedOptionId === option.id;
          const letter = OPTION_LETTERS[index] || String(index + 1);

          return (
            <div
              key={option.id}
              onClick={() => !isDisabled && setSelectedOptionId(option.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderRadius: '16px',
                backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.07)' : 'var(--bg-card)',
                border: isSelected ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-color)',
                boxShadow: isSelected
                  ? '0 10px 25px -5px rgba(99, 102, 241, 0.2), 0 0 0 1px var(--accent-primary)'
                  : 'var(--shadow-sm)',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: isDisabled ? 0.75 : 1,
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Option Letter Tag */}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: isSelected
                      ? 'var(--accent-gradient)'
                      : 'var(--bg-input)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    border: isSelected ? 'none' : '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {letter}
                </div>

                {/* Option Text */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      transition: 'color 0.2s',
                    }}
                  >
                    {option.text}
                  </span>
                </div>
              </div>

              {/* Selection Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isSelected ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Selected</span>
                  </div>
                ) : (
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '2px solid var(--border-color)',
                      backgroundColor: 'transparent',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* High-Impact Submit Vote Button */}
      <button
        type="submit"
        disabled={isDisabled || isSubmitting || !selectedOptionId}
        style={{
          marginTop: '12px',
          padding: '16px 28px',
          borderRadius: '16px',
          background: isDisabled || !selectedOptionId
            ? 'var(--bg-input)'
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
          color: isDisabled || !selectedOptionId ? 'var(--text-muted)' : '#ffffff',
          fontWeight: 800,
          fontSize: '1.08rem',
          cursor: isDisabled || !selectedOptionId ? 'not-allowed' : 'pointer',
          boxShadow: isDisabled || !selectedOptionId
            ? 'none'
            : '0 12px 28px -6px rgba(99, 102, 241, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: !isDisabled && selectedOptionId && !isSubmitting ? 'scale(1)' : 'none',
        }}
      >
        {isSubmitting ? (
          <>
            <div className="live-dot" style={{ width: '10px', height: '10px', backgroundColor: 'white' }} />
            <span>Submitting Vote...</span>
          </>
        ) : hasVoted ? (
          <>
            <CheckCircle2 size={20} />
            <span>Vote Already Cast</span>
          </>
        ) : (
          <>
            <Sparkles size={20} />
            <span>Submit Vote</span>
            <Send size={18} />
          </>
        )}
      </button>
    </form>
  );
};
