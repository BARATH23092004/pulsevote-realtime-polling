import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Zap, ShieldCheck, Share2, BarChart2, ArrowRight, Sparkles } from 'lucide-react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LandingPage: React.FC = () => {
  const { demoLogin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [demoSelected, setDemoSelected] = useState<string>('opt_1');
  const [demoVotes, setDemoVotes] = useState({ opt_1: 42, opt_2: 28, opt_3: 15 });
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);

  const handleDemoVote = (optId: string) => {
    setDemoSelected(optId);
    setDemoVotes(prev => ({
      ...prev,
      [optId]: prev[optId as keyof typeof prev] + 1
    }));
  };

  const handleQuickDemoLogin = async () => {
    setIsDemoSubmitting(true);
    try {
      await demoLogin();
      showToast('Logged in as Demo User!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Demo login failed.', 'error');
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  const totalDemoVotes = demoVotes.opt_1 + demoVotes.opt_2 + demoVotes.opt_3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{ padding: '80px 0 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'center' }}>
          <div>
            <div className="live-indicator" style={{ marginBottom: '20px' }}>
              <span className="live-dot" /> Next-Gen Real-Time Engine
            </div>

            <h1 style={{ fontSize: '3.2rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px', color: 'var(--text-primary)' }}>
              Opinions, <br />
              <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                in real time.
              </span>
            </h1>

            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
              Create stunning customizable polls in seconds, share unique public links, and watch response results update live across all connected devices with zero page refreshes.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link
                to="/register"
                style={{
                  padding: '14px 28px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                Create Your First Poll
                <ArrowRight size={18} />
              </Link>

              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={isDemoSubmitting}
                style={{
                  padding: '14px 24px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Sparkles size={18} />
                {isDemoSubmitting ? 'Logging in Demo...' : '1-Click Demo Login'}
              </button>
            </div>
          </div>

          {/* Hero Interactive Demo Card */}
          <div id="demo-section" className="glass-card" style={{ padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="live-indicator" style={{ fontSize: '0.8rem' }}>
                <span className="live-dot" /> Live Demo
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{totalDemoVotes} total votes</div>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              What is your primary backend framework of choice?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                { id: 'opt_1', text: 'Go (Gin / Chi)', count: demoVotes.opt_1 },
                { id: 'opt_2', text: 'Node.js (Express / Nest)', count: demoVotes.opt_2 },
                { id: 'opt_3', text: 'Python (FastAPI / Django)', count: demoVotes.opt_3 },
              ].map(opt => {
                const pct = ((opt.count / totalDemoVotes) * 100).toFixed(1);
                const isSelected = demoSelected === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleDemoVote(opt.id)}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-primary)' }}>{opt.text}</span>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{pct}%</span>
                    </div>

                    <div className="progress-bar-track" style={{ height: '8px' }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Click any option above to test instantaneous vote calculation.
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section style={{ padding: '60px 0', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 50px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>
              Built for High-Scale Realtime Engagement
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
              PulseVote leverages Go performance, Redis Pub/Sub messaging, and WebSocket streaming to deliver instant updates with zero latency.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ padding: '12px', width: 'fit-content', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', marginBottom: '16px' }}>
                <Zap size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>Zero-Refresh Live Updates</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Redis Pub/Sub pushes vote events directly into WebSockets, updating all connected audience browsers simultaneously without page reloads.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ padding: '12px', width: 'fit-content', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', marginBottom: '16px' }}>
                <ShieldCheck size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>Duplicate Voting Protection</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Protect your poll integrity. Restrict voting to one vote per participant using client device fingerprinting and IP verification.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ padding: '12px', width: 'fit-content', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', marginBottom: '16px' }}>
                <Share2 size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>Instant One-Click Sharing</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Generate clean, memorable URLs. Share poll links with audiences via social media, chat apps, or mobile QR previews.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ padding: '12px', width: 'fit-content', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-info)', marginBottom: '16px' }}>
                <BarChart2 size={26} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>Creator Analytics</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Track total votes, percentage breakdowns, active vs expired statuses, and manage your poll portfolio from a sleek dashboard.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '70px 0', textAlign: 'center' }}>
        <div className="container">
          <div className="glass-card" style={{ padding: '50px 30px', maxWidth: '800px', margin: '0 auto', background: 'var(--accent-gradient)', color: 'white' }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '16px' }}>Ready to capture real-time audience opinions?</h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '28px', maxWidth: '600px', margin: '0 auto 28px' }}>
              Join thousands of creators hosting engaging real-time polls. Free account, zero configuration.
            </p>
            <Link
              to="/register"
              style={{
                padding: '14px 32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'white',
                color: 'var(--accent-primary)',
                fontWeight: 800,
                fontSize: '1rem',
                display: 'inline-block',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
