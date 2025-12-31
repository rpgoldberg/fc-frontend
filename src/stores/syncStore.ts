/**
 * Sync Store - Global state for MFC sync operations
 *
 * Manages the sync session state globally so it can be:
 * 1. Started from the sync modal
 * 2. Displayed in the persistent banner
 * 3. Accessed for auto-refresh of figure cards
 */

import { create } from 'zustand';
import {
  SyncPhase,
  SyncJobStats,
} from '../types';

export type SseConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SyncState {
  // Session info
  sessionId: string | null;
  isActive: boolean;

  // SSE connection
  connectionState: SseConnectionState;

  // Sync progress
  phase: SyncPhase | null;
  stats: SyncJobStats | null;
  message: string | null;
  error: Error | null;

  // Failed items tracking
  failedItems: Array<{ mfcId: string; error?: string }>;

  // Actions
  startSync: (sessionId: string) => void;
  updateConnectionState: (state: SseConnectionState) => void;
  updateProgress: (phase: SyncPhase, stats: SyncJobStats, message?: string) => void;
  addFailedItem: (mfcId: string, error?: string) => void;
  setError: (error: Error | null) => void;
  completeSync: (phase: SyncPhase, stats: SyncJobStats, message?: string) => void;
  cancelSync: () => void;
  reset: () => void;
}

const DEFAULT_STATS: SyncJobStats = {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  skipped: 0,
};

export const useSyncStore = create<SyncState>((set) => ({
  // Initial state
  sessionId: null,
  isActive: false,
  connectionState: 'disconnected',
  phase: null,
  stats: null,
  message: null,
  error: null,
  failedItems: [],

  // Start a new sync session
  startSync: (sessionId: string) =>
    set({
      sessionId,
      isActive: true,
      connectionState: 'connecting',
      phase: 'validating',
      stats: DEFAULT_STATS,
      message: 'Starting sync...',
      error: null,
      failedItems: [],
    }),

  // Update SSE connection state
  updateConnectionState: (connectionState: SseConnectionState) =>
    set({ connectionState }),

  // Update sync progress from SSE events
  updateProgress: (phase: SyncPhase, stats: SyncJobStats, message?: string) =>
    set((state) => ({
      phase,
      stats,
      message: message || state.message,
    })),

  // Track failed items
  addFailedItem: (mfcId: string, error?: string) =>
    set((state) => ({
      failedItems: [...state.failedItems, { mfcId, error }],
    })),

  // Set error state
  setError: (error: Error | null) =>
    set({ error }),

  // Mark sync as complete
  completeSync: (phase: SyncPhase, stats: SyncJobStats, message?: string) =>
    set({
      phase,
      stats,
      message: message || 'Sync complete',
      isActive: false,
      connectionState: 'disconnected',
    }),

  // Cancel sync
  cancelSync: () =>
    set({
      phase: 'cancelled',
      message: 'Sync cancelled',
      isActive: false,
      connectionState: 'disconnected',
    }),

  // Reset all state
  reset: () =>
    set({
      sessionId: null,
      isActive: false,
      connectionState: 'disconnected',
      phase: null,
      stats: null,
      message: null,
      error: null,
      failedItems: [],
    }),
}));
