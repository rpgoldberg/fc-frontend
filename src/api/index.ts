/**
 * API Client - Desktop frontend configuration
 *
 * Creates the axios instance using fc-shared's createApiClient(),
 * then exports bound API functions that match the original signatures
 * (without the leading AxiosInstance parameter).
 */
import {
  createApiClient,
  loginUser as _loginUser,
  registerUser as _registerUser,
  refreshAccessToken as _refreshAccessToken,
  logoutUser as _logoutUser,
  logoutAllSessions as _logoutAllSessions,
  getUserSessions as _getUserSessions,
  getUserProfile as _getUserProfile,
  updateUserProfile as _updateUserProfile,
  getFigures as _getFigures,
  getFigureById as _getFigureById,
  createFigure as _createFigure,
  updateFigure as _updateFigure,
  deleteFigure as _deleteFigure,
  searchFigures as _searchFigures,
  filterFigures as _filterFigures,
  getFigureStats as _getFigureStats,
  getPublicConfig as _getPublicConfig,
  previewBulkImport as _previewBulkImport,
  executeBulkImport as _executeBulkImport,
  getLists as _getLists,
  getListById as _getListById,
  createList as _createList,
  updateList as _updateList,
  deleteList as _deleteList,
  getListsByItem as _getListsByItem,
  addItemsToList as _addItemsToList,
  removeItemsFromList as _removeItemsFromList,
  syncLists as _syncLists,
  verifyEmailToken as _verifyEmailToken,
  resendVerificationEmail as _resendVerificationEmail,
  forgotPasswordRequest as _forgotPasswordRequest,
  resetPasswordRequest as _resetPasswordRequest,
  verify2FA as _verify2FA,
  setupTOTP as _setupTOTP,
  verifyTOTPSetup as _verifyTOTPSetup,
  disableTOTP as _disableTOTP,
  regenerateBackupCodes as _regenerateBackupCodes,
  getWebAuthnRegisterOptions as _getWebAuthnRegisterOptions,
  verifyWebAuthnRegistration as _verifyWebAuthnRegistration,
  getWebAuthnLoginOptions as _getWebAuthnLoginOptions,
  verifyWebAuthnLogin as _verifyWebAuthnLogin,
  deleteWebAuthnCredential as _deleteWebAuthnCredential,
} from '@figurecollecting/fc-shared';
import type { User, Figure, FigureFormData, PaginatedResponse, SearchResult, StatsData, SystemConfig, BulkImportPreviewResponse, BulkImportExecuteResponse, MfcList, MfcListFormData, ListPrivacy } from '@figurecollecting/fc-shared';
import { useAuthStore } from '../stores/authStore';
import { createLogger } from '../utils/logger';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const logger = createLogger('API');

// DEBUGGING: Log the API URL being used
logger.info('API_URL configured as:', API_URL);
logger.info('Environment:', process.env.NODE_ENV);
logger.verbose('Full REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

// Create configured axios instance using shared client factory
const api = createApiClient({
  baseUrl: API_URL,
  auth: {
    getToken: () => useAuthStore.getState().user?.token,
    getRefreshToken: () => useAuthStore.getState().user?.refreshToken,
    updateTokens: (token, refreshToken, tokenExpiresAt) =>
      useAuthStore.getState().updateTokens(token, refreshToken, tokenExpiresAt),
    recordActivity: () => useAuthStore.getState().recordActivity(),
    logout: () => {
      useAuthStore.getState().logout();
      localStorage.removeItem('auth-storage');
    },
    onAuthFailure: () => {
      window.location.href = '/login';
    },
  },
});

// ============================================================================
// Bound API functions - same signatures as the original local implementations
// ============================================================================

// Auth API
export const loginUser = (email: string, password: string): Promise<User | { requiresTwoFactor: true; sessionId: string; methods: string[] }> =>
  _loginUser(api, email, password);

export const registerUser = (username: string, email: string, password: string): Promise<User> =>
  _registerUser(api, username, email, password);

export const refreshAccessToken = (currentRefreshToken: string): Promise<{ token: string; refreshToken?: string; tokenExpiresAt: number }> =>
  _refreshAccessToken(api, currentRefreshToken);

export const logoutUser = (): Promise<void> => _logoutUser(api);

export const logoutAllSessions = (): Promise<void> => _logoutAllSessions(api);

export const getUserSessions = (): Promise<any[]> => _getUserSessions(api);

export const getUserProfile = (): Promise<User> => _getUserProfile(api);

export const updateUserProfile = (userData: Partial<User>): Promise<User> =>
  _updateUserProfile(api, userData);

// Figures API
export const getFigures = (
  page = 1,
  limit = 10,
  sortBy = 'activity',
  sortOrder: 'asc' | 'desc' = 'asc',
  status?: 'owned' | 'ordered' | 'wished'
): Promise<PaginatedResponse<Figure>> =>
  _getFigures(api, page, limit, sortBy, sortOrder, status);

export const getFigureById = (id: string): Promise<Figure> =>
  _getFigureById(api, id);

export const createFigure = (figureData: FigureFormData): Promise<Figure> =>
  _createFigure(api, figureData);

export const updateFigure = (id: string, figureData: FigureFormData): Promise<Figure> =>
  _updateFigure(api, id, figureData);

export const deleteFigure = (id: string): Promise<void> =>
  _deleteFigure(api, id);

export const searchFigures = (query: string): Promise<SearchResult[]> =>
  _searchFigures(api, query);

export const filterFigures = (
  params: {
    manufacturer?: string;
    distributor?: string;
    scale?: string;
    origin?: string;
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: 'owned' | 'ordered' | 'wished';
  }
): Promise<PaginatedResponse<Figure>> =>
  _filterFigures(api, params);

export const getFigureStats = (status?: 'owned' | 'ordered' | 'wished'): Promise<StatsData> =>
  _getFigureStats(api, status);

// Public Config API
export const getPublicConfig = (key: string): Promise<SystemConfig | null> =>
  _getPublicConfig(api, key);

// Bulk Import API
export const previewBulkImport = (csvContent: string): Promise<BulkImportPreviewResponse> =>
  _previewBulkImport(api, csvContent);

export const executeBulkImport = (csvContent: string, skipDuplicates = true): Promise<BulkImportExecuteResponse> =>
  _executeBulkImport(api, csvContent, skipDuplicates);

// Lists API
export const getLists = (params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  privacy?: ListPrivacy;
}): Promise<PaginatedResponse<MfcList>> =>
  _getLists(api, params);

export const getListById = (id: string): Promise<MfcList> =>
  _getListById(api, id);

export const createList = (data: MfcListFormData): Promise<MfcList> =>
  _createList(api, data);

export const updateList = (id: string, data: Partial<MfcListFormData>): Promise<MfcList> =>
  _updateList(api, id, data);

export const deleteList = (id: string): Promise<void> =>
  _deleteList(api, id);

export const getListsByItem = (mfcId: number): Promise<{ _id: string; name: string }[]> =>
  _getListsByItem(api, mfcId);

export const addItemsToList = (listId: string, mfcIds: number[]): Promise<MfcList> =>
  _addItemsToList(api, listId, mfcIds);

export const removeItemsFromList = (listId: string, mfcIds: number[]): Promise<MfcList> =>
  _removeItemsFromList(api, listId, mfcIds);

export const syncLists = (lists: MfcListFormData[]): Promise<{ upserted: number }> =>
  _syncLists(api, lists);

// Email Verification
export const verifyEmailToken = (token: string, userId: string) =>
  _verifyEmailToken(api, token, userId);

export const resendVerificationEmail = (email: string) =>
  _resendVerificationEmail(api, email);

export const forgotPasswordRequest = (email: string) =>
  _forgotPasswordRequest(api, email);

export const resetPasswordRequest = (token: string, password: string, userId: string) =>
  _resetPasswordRequest(api, token, password, userId);

// Two-Factor
export const verify2FA = (sessionId: string, method: string, code: string) =>
  _verify2FA(api, sessionId, method, code);

export const setupTOTP = () => _setupTOTP(api);

export const verifyTOTPSetup = (code: string) => _verifyTOTPSetup(api, code);

export const disableTOTP = (code: string) => _disableTOTP(api, code);

export const regenerateBackupCodes = (code: string) => _regenerateBackupCodes(api, code);

// WebAuthn
export const getWebAuthnRegisterOptions = (nickname?: string) =>
  _getWebAuthnRegisterOptions(api, nickname);

export const verifyWebAuthnRegistration = (challengeId: string, response: any) =>
  _verifyWebAuthnRegistration(api, challengeId, response);

export const getWebAuthnLoginOptions = (email?: string) =>
  _getWebAuthnLoginOptions(api, email);

export const verifyWebAuthnLogin = (challengeId: string, response: any) =>
  _verifyWebAuthnLogin(api, challengeId, response);

export const deleteWebAuthnCredential = (credentialId: string) =>
  _deleteWebAuthnCredential(api, credentialId);
