import React from 'react';
import { Trophy, Signal, SignalZero } from 'lucide-react';
import type { PollResultsResponse } from '../../types';
import type { ConnectionState } from '../../hooks/useWebSocket';

interface LiveResultsChartProps {
  results: PollResultsResponse;
  connectionState?: ConnectionState;
}

export const LiveResultsChart: React.FC<LiveResultsChartProps> = ({ results, connectionState = 'connected' }) => {
  const maxVoteCount = Math.max(...results.options.map(o => o.count), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Realtime Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
        <div className="live-indicator">
          <span className="live-dot" />
          <span>Live Results</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {connectionState === 'connected' ? (
            <Signal size={16} style={{ color: 'var(--accent-success)' }} />
          ) : (
            <SignalZero size={16} style={{ color: 'var(--accent-warning)' }} />
          )}
          <span>{connectionState === 'connected' ? 'WebSocket Connected' : 'Reconnecting...'}</span>
        </div>
      </div>

      {/* Option Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {results.options.map(option => {
          const isWinner = maxVoteCount > 0 && option.count === maxVoteCount;
          const formattedPct = option.percentage.toFixed(1);

          return (
            <div
              key={option.id}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: isWinner && results.totalVotes > 0 ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                transition: 'all var(--transition-normal)',
                boxShadow: isWinner && results.totalVotes > 0 ? 'var(--shadow-glow)' : 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isWinner && results.totalVotes > 0 && <Trophy size={16} style={{ color: '#f59e0b' }} />}
                  <span>{option.text}</span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {formattedPct}% <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>({option.count} {option.count === 1 ? 'vote' : 'votes'})</span>
                </div>
              </div>

              {/* Dynamic Progress Bar Track */}
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.max(option.percentage, option.count > 0 ? 3 : 0)}%`,
                    background: isWinner && results.totalVotes > 0
                      ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                      : 'var(--bg-card-hover)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Votes Summary */}
      <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
        Total Votes Cast: <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{results.totalVotes}</span>
      </div>
    </div>
  );
};
