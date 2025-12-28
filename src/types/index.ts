export type ColorProfile = 'light' | 'dark' | 'terminal' | 'tokyonight' | 'nord' | 'dracula' | 'solarized' | 'cyberpunk';

export interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  colorProfile?: ColorProfile;
  token?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Schema v3.0 Enums and Subdocument Types
// ═══════════════════════════════════════════════════════════════════════════

// Simplified to 3 options: preordered merged into ordered
export type CollectionStatus = 'owned' | 'ordered' | 'wished';

// Merchant info for tracking where figures were purchased
export interface IMerchant {
  name: string;
  url?: string;
}

// Figure condition includes "sealed" since many collectors keep figures unopened
export type FigureCondition = 'sealed' | 'likenew' | 'verygood' | 'good' | 'fair' | 'poor';

// Box condition is separate - figure could be opened but box pristine, or vice versa
export type BoxCondition = 'mint' | 'verygood' | 'good' | 'fair' | 'poor';

export interface IRelease {
  date?: string;
  price?: number;
  currency?: string;
  isRerelease?: boolean;
  jan?: string;  // JAN/EAN/UPC barcode (10-13 digits)
}

export interface IDimensions {
  heightMm?: number;
  widthMm?: number;
  depthMm?: number;
  scaledHeight?: number;
}

export interface IPurchaseInfo {
  date?: string;
  price?: number;
  currency?: string;
}

export interface ICompanyRole {
  companyId: string;
  companyName?: string; // For display purposes
  roleId: string;
  roleName?: string; // For display purposes
}

export interface IArtistRole {
  artistId: string;
  artistName?: string; // For display purposes
  roleId: string;
  roleName?: string; // For display purposes
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Figure Interface (Schema v3.0)
// ═══════════════════════════════════════════════════════════════════════════

export interface Figure {
  _id: string;
  // Core fields (existing)
  manufacturer: string;
  name: string;
  scale: string;
  mfcLink?: string;
  location?: string;
  storageDetail?: string; // Specific location within storage (shelf label, box ID, etc.)
  boxNumber?: string; // Legacy alias for storageDetail (backward compatibility)
  imageUrl?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  searchScore?: number;

  // Schema v3.0 - Product identification
  mfcId?: number;
  jan?: string; // JAN/UPC/EAN barcode

  // Schema v3.0 - Releases (array for rereleases)
  releases?: IRelease[];

  // Schema v3.0 - Physical dimensions
  dimensions?: IDimensions;

  // Schema v3.0 - Company/Artist roles
  companyRoles?: ICompanyRole[];
  artistRoles?: IArtistRole[];

  // Schema v3.0 - User-specific data
  collectionStatus?: CollectionStatus;
  purchaseInfo?: IPurchaseInfo;
  merchant?: IMerchant;
  rating?: number; // 1-10 for owned figures
  wishRating?: number; // 1-5 priority stars for wished figures
  quantity?: number; // Number of copies owned (default 1)
  note?: string; // Personal notes/comments about this figure

  // Condition tracking (figure and box are separate)
  figureCondition?: FigureCondition;
  figureConditionNotes?: string;
  boxCondition?: BoxCondition;
  boxConditionNotes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Form Data Interface (Schema v3.0)
// ═══════════════════════════════════════════════════════════════════════════

export interface FigureFormData {
  // Core fields (existing)
  manufacturer: string;
  name: string;
  scale: string;
  mfcLink?: string;
  mfcAuth?: string; // Not stored, only used for scraping
  location?: string;
  storageDetail?: string; // Specific location within storage (shelf label, box ID, etc.)
  boxNumber?: string; // Legacy alias for storageDetail (backward compatibility)
  imageUrl?: string;

  // Schema v3.0 - Product identification
  mfcId?: number;
  jan?: string; // JAN/UPC/EAN barcode

  // Schema v3.0 - Primary release (simplified for form)
  releaseDate?: string;
  releasePrice?: number;
  releaseCurrency?: string;

  // Schema v3.0 - Physical dimensions
  heightMm?: number;
  widthMm?: number;
  depthMm?: number;

  // Schema v3.0 - User-specific data
  collectionStatus?: CollectionStatus;
  purchaseDate?: string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  merchantName?: string;
  merchantUrl?: string;
  rating?: number; // 1-10 for owned figures
  wishRating?: number; // 1-5 priority stars for wished figures
  quantity?: number; // Number of copies owned (default 1)
  note?: string; // Personal notes/comments about this figure

  // Condition tracking (figure and box are separate)
  figureCondition?: FigureCondition;
  figureConditionNotes?: string;
  boxCondition?: BoxCondition;
  boxConditionNotes?: string;
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
