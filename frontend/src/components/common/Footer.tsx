import React from 'react';
import { Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-color)',
      padding: '40px 0 20px',
      marginTop: 'auto',
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--text-secondary)',
      fontSize: '0.9rem'
    }}>
      <div className="container">
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            <Activity size={20} style={{ color: 'var(--accent-primary)' }} />
            PulseVote
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>Powered by <strong>Go (Gin)</strong></span>
            <span>•</span>
            <span><strong>MongoDB</strong></span>
            <span>•</span>
            <span><strong>Redis Pub/Sub</strong></span>
            <span>•</span>
            <span><strong>WebSockets & React</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div>© {new Date().getFullYear()} PulseVote. All rights reserved. Full Stack SaaS Application.</div>
          <div className="live-indicator" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
            <span className="live-dot" /> Realtime Engine Active
          </div>
        </div>
      </div>
    </footer>
  );
};
