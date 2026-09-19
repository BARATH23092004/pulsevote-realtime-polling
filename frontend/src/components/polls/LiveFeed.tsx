import React from 'react';
import { Activity, Radio, CheckCircle, Clock, Zap } from 'lucide-react';
import type { ConnectionState } from '../../hooks/useWebSocket';

export interface FeedItem {
  id: string;
  message: string;
  subtext?: string;
  timestamp: string;
  type: 'vote' | 'system' | 'status';
  badge?: string;
}

interface LiveFeedProps {
  items: FeedItem[];
  connectionState: ConnectionState;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({ items, connectionState }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        padding: '20px',
        marginTop: '24px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <Radio size={16} className={connectionState === 'connected' ? 'pulse-live' : ''} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Live Activity Feed
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Real-time WebSocket & Redis event stream
            </span>
          </div>
        </div>

        <div className="live-indicator" style={{ fontSize: '0.78rem', padding: '3px 8px' }}>
          <span className="live-dot" />
          <span>{connectionState === 'connected' ? 'Streaming Live' : 'Reconnecting'}</span>
        </div>
      </div>

      {/* Feed List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '260px',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Activity size={24} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
            No live votes recorded in this session yet.
            <br />
            Share the link to watch votes arrive in real time!
          </div>
        ) : (
          items.map((item, idx) => {
            const isFirst = idx === 0;

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isFirst && item.type === 'vote' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                  border: isFirst && item.type === 'vote' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                  transition: 'all 0.3s ease',
                  animation: isFirst ? 'fadeIn 0.3s ease' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor:
                        item.type === 'vote'
                          ? 'var(--accent-success)'
                          : item.type === 'status'
                          ? 'var(--accent-warning)'
                          : 'var(--accent-primary)',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.message}
                    </div>
                    {item.subtext && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {item.subtext}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <Clock size={12} />
                  <span>{item.timestamp}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
