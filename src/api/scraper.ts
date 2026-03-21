/**
 * Scraper Service API Client - Desktop frontend configuration
 *
 * Uses fc-shared's createSimpleApiClient() for the sync/scraper endpoints,
 * then exports bound functions matching the original local signatures.
 */
import {
  createSimpleApiClient,
  getMfcCookieAllowlist as _getMfcCookieAllowlist,
  validateMfcCookies as _validateMfcCookies,
  executeFullSync as _executeFullSync,
  syncFromCsv as _syncFromCsv,
  parseMfcCsv as _parseMfcCsv,
  getQueueStats as _getQueueStats,
  getSyncStatus as _getSyncStatus,
  createSyncJob as _createSyncJob,
  getSyncJob as _getSyncJob,
  getActiveJob as _getActiveJob,
  cancelSyncJob as _cancelSyncJob,
  getSyncSessions as _getSyncSessions,
  resumeSyncSession as _resumeSyncSession,
  cancelFailedItems as _cancelFailedItems,
} from '@figurecollecting/fc-shared';
import type {
  CookieAllowlistResponse,
  FullSyncOptions,
  CsvSyncOptions,
  ParseCsvResult,
  CreateSyncJobOptions,
  CreateSyncJobResult,
  ActiveJobResponse,
  SessionStatus,
} from '@figurecollecting/fc-shared';
import type {
  MfcCookies,
  MfcCookieValidationResult,
  MfcSyncResult,
  MfcQueueStats,
} from '../types';
import { useAuthStore } from '../stores/authStore';
import { createLogger } from '../utils/logger';

// Sync routes go through the backend (which proxies to scraper)
const SYNC_URL = process.env.REACT_APP_SYNC_URL || '/api';
const logger = createLogger('SCRAPER_API');

logger.info('Sync API URL configured as:', SYNC_URL);

// Create axios instance for sync operations (via backend)
const scraperApi = createSimpleApiClient({
  baseUrl: SYNC_URL,
  auth: {
    getToken: () => useAuthStore.getState().user?.token,
  },
});

// ============================================================================
// Bound API functions - same signatures as the original local implementations
// ============================================================================

export const getMfcCookieAllowlist = (): Promise<CookieAllowlistResponse> =>
  _getMfcCookieAllowlist(scraperApi);

export const validateMfcCookies = (cookies: MfcCookies): Promise<MfcCookieValidationResult> =>
  _validateMfcCookies(scraperApi, cookies);

export const executeFullSync = (options: FullSyncOptions): Promise<MfcSyncResult> =>
  _executeFullSync(scraperApi, options);

export const syncFromCsv = (options: CsvSyncOptions): Promise<MfcSyncResult> =>
  _syncFromCsv(scraperApi, options);

export const parseMfcCsv = (csvContent: string): Promise<ParseCsvResult> =>
  _parseMfcCsv(scraperApi, csvContent);

export const getQueueStats = (): Promise<MfcQueueStats> =>
  _getQueueStats(scraperApi);

export const getSyncStatus = (): Promise<{ queueStats: MfcQueueStats; isProcessing: boolean }> =>
  _getSyncStatus(scraperApi);

export const createSyncJob = (options: CreateSyncJobOptions): Promise<CreateSyncJobResult> =>
  _createSyncJob(scraperApi, options);

export const getSyncJob = (sessionId: string): Promise<{
  sessionId: string;
  phase: string;
  message: string;
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  startedAt: string;
  completedAt?: string;
} | null> =>
  _getSyncJob(scraperApi, sessionId);

export const getActiveJob = (): Promise<ActiveJobResponse['job'] | null> =>
  _getActiveJob(scraperApi);

export const cancelSyncJob = (sessionId: string): Promise<void> =>
  _cancelSyncJob(scraperApi, sessionId);

export const getSyncSessions = (): Promise<{
  sessions: SessionStatus[];
  count: number;
  pausedCount: number;
  inCooldownCount: number;
}> =>
  _getSyncSessions(scraperApi);

export const resumeSyncSession = (sessionId: string): Promise<void> =>
  _resumeSyncSession(scraperApi, sessionId);

export const cancelFailedItems = (sessionId: string): Promise<number> =>
  _cancelFailedItems(scraperApi, sessionId);

// Re-export types that consumers import from this module
export type { CookieAllowlistResponse, FullSyncOptions, CsvSyncOptions, ParseCsvResult, CreateSyncJobOptions, CreateSyncJobResult, ActiveJobResponse, SessionStatus };

// Export the axios instance for consumers that need direct access
export { scraperApi };
