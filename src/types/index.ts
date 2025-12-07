export type ColorProfile = 'light' | 'dark' | 'terminal' | 'tokyonight' | 'nord' | 'dracula' | 'solarized' | 'cyberpunk';

export interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  colorProfile?: ColorProfile;
  token?: string;
}

export interface Figure {
  _id: string;
  manufacturer: string;
  name: string;
  scale: string;
  mfcLink?: string;
  location?: string;
  boxNumber?: string;
  imageUrl?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  searchScore?: number;
}

export interface FigureFormData {
  manufacturer: string;
  name: string;
  scale: string;
  mfcLink?: string;
  mfcAuth?: string;
  location?: string;
  boxNumber?: string;
  imageUrl?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  count: number;
  page: number;
  pages: number;
  total: number;
  data: T[];
}

export interface SearchResult {
  id: string;
  manufacturer: string;
  name: string;
  scale: string;
  mfcLink: string;
  location: string;
  boxNumber: string;
  imageUrl?: string;
  searchScore?: number;
}

export interface StatsData {
  totalCount: number;
  manufacturerStats: { _id: string; count: number }[];
  scaleStats: { _id: string; count: number }[];
  locationStats: { _id: string; count: number }[];
}

export interface SystemConfig {
  key: string;
  value: string;
  type: 'string' | 'json' | 'markdown' | 'script';
  description?: string;
  isPublic: boolean;
}

// Bulk Import Types
export type BulkImportItemStatus = 'new' | 'catalog_exists' | 'duplicate';

export interface BulkImportPreviewItem {
  mfcId: number;
  title: string;
  cleanTitle: string;
  manufacturers: string[];
  scale?: string;
  status: BulkImportItemStatus;
  collectionStatus: string;
  rating?: number;
  note?: string;
}

export interface BulkImportPreviewResponse {
  success: boolean;
  totalItems: number;
  summary: {
    new: number;
    catalogExists: number;
    duplicates: number;
  };
  items: BulkImportPreviewItem[];
}

export interface BulkImportExecuteResponse {
  success: boolean;
  totalItems: number;
  imported: number;
  skipped: number;
  errors: Array<{
    mfcId: number;
    title: string;
    error: string;
  }>;
}

// MFC Sync Types (Scraper Service)
export interface MfcCookies {
  PHPSESSID: string;
  sesUID: string;
  sesDID: string;
}

export interface MfcCookieValidationResult {
  valid: boolean;
  username?: string;
  userId?: string;
  error?: string;
}

export interface MfcSyncStats {
  owned: number;
  ordered: number;
  wished: number;
  total: number;
  nsfw: number;
}

export interface MfcSyncResult {
  success: boolean;
  parsedCount: number;
  queuedCount: number;
  skippedCount: number;
  listsFound?: number;
  stats: MfcSyncStats;
  errors: string[];
}

export interface MfcQueueStats {
  queues: {
    hot: number;
    warm: number;
    cold: number;
  };
  total: number;
  processing: number;
  completed: number;
  failed: number;
  rateLimit: {
    active: boolean;
    currentDelayMs: number;
  };
}

export interface MfcParsedItem {
  mfcId: string;
  name: string;
  status: 'owned' | 'ordered' | 'wished';
  category?: string;
  releaseDate?: string;
  price?: string;
  isNsfw: boolean;
}
