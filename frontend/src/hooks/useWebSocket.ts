import { useEffect, useRef, useState, useCallback } from 'react';
import type { VoteBroadcastEvent } from '../types';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface UseWebSocketOptions {
  pollId: string;
  onMessage?: (data: VoteBroadcastEvent) => void;
  enabled?: boolean;
}

export const useWebSocket = ({ pollId, onMessage, enabled = true }: UseWebSocketOptions) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!pollId || !enabled) return;

    // Clean up existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/api';
    const wsUrl = `${wsBaseUrl}/polls/${pollId}/ws`;

    setConnectionState(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const parsedData: VoteBroadcastEvent = JSON.parse(event.data);
          if (onMessage) {
            onMessage(parsedData);
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse event payload:', err);
        }
      };

      ws.onerror = (error) => {
        console.warn('[WebSocket Warning] Connection error:', error);
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        wsRef.current = null;

        // Auto reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts && enabled) {
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, timeout);
        }
      };
    } catch (err) {
      console.error('[WebSocket Error] Initialization failed:', err);
      setConnectionState('disconnected');
    }
  }, [pollId, enabled, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connectionState, reconnect: connect };
};
