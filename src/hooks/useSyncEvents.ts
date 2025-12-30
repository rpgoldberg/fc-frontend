/**
 * useSyncEvents Hook - Server-Sent Events for MFC Sync Progress
 *
 * Manages a real-time SSE connection to the backend for sync progress updates.
 * Automatically reconnects on disconnect with exponential backoff.
 *
 * Events received:
 * - connected: Initial state when SSE connection established
 * - item-update: Individual item processing completion
 * - phase-change: Sync phase transitions (validating → enriching → completed)
 * - sync-complete: Final sync completion (success, failure, or cancellation)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SyncPhase,
  SyncJobStats,
  SseConnectedEvent,
  SseItemUpdateEvent,
  SsePhaseChangeEvent,
  SseSyncCompleteEvent,
} from '../types';
import { useAuthStore } from '../stores/authStore';
import { createLogger } from '../utils/logger';

const logger = createLogger('SYNC_EVENTS');

// Base URL for SSE endpoint (same as API since it's proxied)
const SYNC_URL = process.env.REACT_APP_SYNC_URL || '/api';

export type SseConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseSyncEventsOptions {
  sessionId: string;
  enabled?: boolean;
  onItemUpdate?: (event: SseItemUpdateEvent) => void;
  onPhaseChange?: (event: SsePhaseChangeEvent) => void;
  onComplete?: (event: SseSyncCompleteEvent) => void;
  onError?: (error: Error) => void;
}

export interface UseSyncEventsResult {
  /** Current SSE connection state */
  connectionState: SseConnectionState;
  /** Current sync phase */
  phase: SyncPhase | null;
  /** Current sync stats */
  stats: SyncJobStats | null;
  /** Current status message */
  message: string | null;
  /** Last error if any */
  error: Error | null;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

const DEFAULT_STATS: SyncJobStats = {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  skipped: 0,
};

/**
 * Hook for managing SSE connection to sync progress stream.
 */
export function useSyncEvents({
  sessionId,
  enabled = true,
  onItemUpdate,
  onPhaseChange,
  onComplete,
  onError,
}: UseSyncEventsOptions): UseSyncEventsResult {
  const [connectionState, setConnectionState] = useState<SseConnectionState>('disconnected');
  const [phase, setPhase] = useState<SyncPhase | null>(null);
  const [stats, setStats] = useState<SyncJobStats | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);

  const { user } = useAuthStore();

  /**
   * Clean up EventSource connection and timers.
   */
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Establish SSE connection.
   */
  const connect = useCallback(() => {
    if (!sessionId || !user?.token) {
      logger.warn('Cannot connect: missing sessionId or auth token');
      return;
    }

    cleanup();
    setConnectionState('connecting');
    setError(null);

    // Construct SSE URL with auth token as query param
    // EventSource doesn't support custom headers, so we pass token in URL
    const sseUrl = `${SYNC_URL}/sync/stream/${sessionId}?token=${encodeURIComponent(user.token)}`;

    logger.info(`Connecting to SSE: ${sessionId}`);
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    // Handle successful connection
    eventSource.addEventListener('connected', (e) => {
      try {
        const data: SseConnectedEvent = JSON.parse((e as MessageEvent).data);
        logger.info('SSE connected:', data);

        setConnectionState('connected');
        setPhase(data.phase);
        setStats(data.stats);
        setMessage(data.message || null);
        reconnectAttemptRef.current = 0; // Reset reconnect counter on success
      } catch (err) {
        logger.error('Failed to parse connected event:', err);
      }
    });

    // Handle item updates
    eventSource.addEventListener('item-update', (e) => {
      try {
        const data: SseItemUpdateEvent = JSON.parse((e as MessageEvent).data);
        logger.verbose('Item update:', data.mfcId, data.status);

        setPhase(data.phase);
        setStats(data.stats);
        onItemUpdate?.(data);
      } catch (err) {
        logger.error('Failed to parse item-update event:', err);
      }
    });

    // Handle phase changes
    eventSource.addEventListener('phase-change', (e) => {
      try {
        const data: SsePhaseChangeEvent = JSON.parse((e as MessageEvent).data);
        logger.info('Phase change:', data.phase, data.message);

        setPhase(data.phase);
        setStats(data.stats);
        setMessage(data.message || null);
        onPhaseChange?.(data);
      } catch (err) {
        logger.error('Failed to parse phase-change event:', err);
      }
    });

    // Handle sync completion
    eventSource.addEventListener('sync-complete', (e) => {
      try {
        const data: SseSyncCompleteEvent = JSON.parse((e as MessageEvent).data);
        logger.info('Sync complete:', data.phase);

        setPhase(data.phase);
        setStats(data.stats);
        setMessage(data.message || null);
        onComplete?.(data);

        // Close connection - no more events expected
        cleanup();
        setConnectionState('disconnected');
      } catch (err) {
        logger.error('Failed to parse sync-complete event:', err);
      }
    });

    // Handle connection errors
    eventSource.onerror = () => {
      logger.warn('SSE connection error');
      setConnectionState('error');

      // Attempt reconnection with exponential backoff
      const attempt = reconnectAttemptRef.current;
      if (attempt < 5) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        logger.info(`Reconnecting in ${delay}ms (attempt ${attempt + 1})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptRef.current = attempt + 1;
          connect();
        }, delay);
      } else {
        const connectionError = new Error('SSE connection failed after multiple attempts');
        setError(connectionError);
        onError?.(connectionError);
        cleanup();
        setConnectionState('error');
      }
    };
  }, [sessionId, user?.token, cleanup, onItemUpdate, onPhaseChange, onComplete, onError]);

  /**
   * Manual disconnect.
   */
  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState('disconnected');
    reconnectAttemptRef.current = 0;
  }, [cleanup]);

  /**
   * Manual reconnect.
   */
  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    connect();
  }, [connect]);

  // Connect when enabled and sessionId is available
  useEffect(() => {
    if (enabled && sessionId && user?.token) {
      connect();
    } else {
      cleanup();
      setConnectionState('disconnected');
    }

    return cleanup;
  }, [enabled, sessionId, user?.token, connect, cleanup]);

  return {
    connectionState,
    phase,
    stats: stats || DEFAULT_STATS,
    message,
    error,
    disconnect,
    reconnect,
  };
}

export default useSyncEvents;
