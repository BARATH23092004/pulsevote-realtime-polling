import React, { useEffect, useState } from 'react';
import { Trophy, CheckCircle, ArrowRight, Zap, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoteBlastModalProps {
  isOpen: boolean;
  selectedOptionText: string;
  onClose: () => void;
  onViewResults: () => void;
}

export const VoteBlastModal: React.FC<VoteBlastModalProps> = ({
  isOpen,
  selectedOptionText,
  onClose,
  onViewResults,
}) => {
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(4);
      return;
    }

    // Trigger full-screen multi-stage firework blast
    const fireBlast = () => {
      // 1. Center burst
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
      });

      // 2. Left cannon
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: ['#6366f1', '#a855f7', '#ec4899'],
        });
      }, 150);

      // 3. Right cannon
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: ['#10b981', '#3b82f6', '#f59e0b'],
        });
      }, 300);

      // 4. Star shower
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 360,
          ticks: 80,
          origin: { x: 0.5, y: 0.4 },
          shapes: ['star'],
          colors: ['#ffd700', '#ffb703', '#ffffff'],
        });
      }, 450);
    };

    fireBlast();

    // Auto countdown to results
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onViewResults();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onViewResults]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '36px 32px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          animation: 'blastPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Background Radiant Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            height: '260px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(236, 72, 153, 0.08) 50%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            color: '#94a3b8',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
        >
          <X size={20} />
        </button>

        {/* Blast Animated Icon Badge */}
        <div
          style={{
            width: '84px',
            height: '84px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 12px 28px -6px rgba(16, 185, 129, 0.45)',
            animation: 'pulseGlow 2s infinite',
          }}
        >
          <CheckCircle size={44} strokeWidth={2.4} />
        </div>

        {/* Title */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#059669',
            fontSize: '0.8rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '10px',
          }}
        >
          <Sparkles size={14} />
          Vote Successfully Recorded!
        </div>

        <h2
          style={{
            fontSize: '1.75rem',
            fontWeight: 900,
            color: '#0f172a',
            lineHeight: 1.2,
            marginBottom: '12px',
          }}
        >
          Boom! You Voted for <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            "{selectedOptionText}"
          </span>
        </h2>

        <p
          style={{
            fontSize: '0.92rem',
            color: '#64748b',
            lineHeight: 1.55,
            marginBottom: '28px',
            maxWidth: '380px',
            margin: '0 auto 28px',
          }}
        >
          Your vote has been saved directly to MongoDB and broadcasted live across all active devices via Redis Pub/Sub!
        </p>

        {/* Live Broadcast Notice Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            textAlign: 'left',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1',
              flexShrink: 0,
            }}
          >
            <Zap size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
              Zero-Refresh Live Feed Active
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Results are updating instantaneously for all spectators
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onViewResults}
          style={{
            width: '100%',
            padding: '15px 24px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.02rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 10px 25px -4px rgba(99, 102, 241, 0.45)',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
        >
          <span>View Live Results ({countdown}s)</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
