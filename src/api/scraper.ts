/**
 * Scraper Service API Client
 *
 * Handles communication with the scraper service for MFC sync operations.
 * Uses a separate axios instance configured for the scraper service URL.
 */

import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import {
  MfcCookies,
  MfcCookieValidationResult,
  MfcSyncResult,
  MfcQueueStats,
  MfcParsedItem,
  MfcSyncStats,
} from '../types';
import { createLogger } from '../utils/logger';

const SCRAPER_URL = process.env.REACT_APP_SCRAPER_URL || '/scraper';
const logger = createLogger('SCRAPER_API');

logger.info('Scraper API URL configured as:', SCRAPER_URL);

// Create axios instance for scraper service
const scraperApi = axios.create({
  baseURL: SCRAPER_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to scraper requests
scraperApi.interceptors.request.use((config) => {
  const { user } = useAuthStore.getState();
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// Handle response errors
scraperApi.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error('Scraper API error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============================================================================
// Cookie Validation
// ============================================================================

/**
 * Validate MFC session cookies
 */
export const validateMfcCookies = async (
  cookies: MfcCookies
): Promise<MfcCookieValidationResult> => {
  logger.info('Validating MFC cookies...');

  const response = await scraperApi.post('/sync/validate-cookies', { cookies });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Cookie validation failed');
  }

  return response.data.data;
};

// ============================================================================
// Full Sync
// ============================================================================

export interface FullSyncOptions {
  cookies: MfcCookies;
  userId: string;
  sessionId: string;
  includeLists?: boolean;
  skipCached?: boolean;
}

/**
 * Execute full MFC sync: validate → export → parse → queue
 */
export const executeFullSync = async (
  options: FullSyncOptions
): Promise<MfcSyncResult> => {
  logger.info('Starting full MFC sync...');

  const response = await scraperApi.post('/sync/full', {
    cookies: options.cookies,
    userId: options.userId,
    sessionId: options.sessionId,
    includeLists: options.includeLists ?? false,
    skipCached: options.skipCached ?? true,
  });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Full sync failed');
  }

  logger.info('Full sync result:', response.data.data);

  return {
    success: true,
    parsedCount: response.data.data.parsedCount,
    queuedCount: response.data.data.queuedCount,
    skippedCount: response.data.data.skippedCount,
    listsFound: response.data.data.listsFound,
    stats: response.data.data.stats,
    errors: response.data.data.errors || [],
  };
};

// ============================================================================
// CSV Sync
// ============================================================================

export interface CsvSyncOptions {
  csvContent: string;
  userId: string;
  cookies?: MfcCookies;
  sessionId?: string;
}

/**
 * Sync from user-provided CSV content
 */
export const syncFromCsv = async (
  options: CsvSyncOptions
): Promise<MfcSyncResult> => {
  logger.info('Starting CSV sync...');

  const response = await scraperApi.post('/sync/from-csv', {
    csvContent: options.csvContent,
    userId: options.userId,
    cookies: options.cookies,
    sessionId: options.sessionId,
  });

  if (!response.data.success) {
    throw new Error(response.data.message || 'CSV sync failed');
  }

  logger.info('CSV sync result:', response.data.data);

  return {
    success: true,
    parsedCount: response.data.data.parsedCount,
    queuedCount: response.data.data.queuedCount,
    skippedCount: response.data.data.skippedCount,
    stats: response.data.data.stats,
    errors: response.data.data.errors || [],
  };
};

// ============================================================================
// CSV Parsing (without queueing)
// ============================================================================

export interface ParseCsvResult {
  items: MfcParsedItem[];
  stats: MfcSyncStats;
}

/**
 * Parse CSV content and return items without queueing
 */
export const parseMfcCsv = async (csvContent: string): Promise<ParseCsvResult> => {
  logger.info('Parsing MFC CSV...');

  const response = await scraperApi.post('/sync/parse-csv', { csvContent });

  if (!response.data.success) {
    throw new Error(response.data.message || 'CSV parsing failed');
  }

  return response.data.data;
};

// ============================================================================
// Queue Status
// ============================================================================

/**
 * Get current queue status and statistics
 */
export const getQueueStats = async (): Promise<MfcQueueStats> => {
  logger.verbose('Fetching queue stats...');

  const response = await scraperApi.get('/sync/queue-stats');

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to get queue stats');
  }

  return response.data.data;
};

/**
 * Get sync status (overall status and queue info)
 */
export const getSyncStatus = async (): Promise<{
  queueStats: MfcQueueStats;
  isProcessing: boolean;
}> => {
  logger.verbose('Fetching sync status...');

  const response = await scraperApi.get('/sync/status');

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to get sync status');
  }

  return response.data.data;
};

// ============================================================================
// Export for convenience
// ============================================================================

export { scraperApi };
