/**
 * Stats Utility Functions for Schema v3
 *
 * Provides helper functions for merging legacy manufacturerStats
 * with Schema v3 companyStats from the companyRoles array.
 */

import { ICompanyRole, IArtistRole } from '../types';

export interface StatEntry {
  _id: string;
  count: number;
  roleName?: string;
}

export interface CompanyStatEntry {
  _id: string;
  count: number;
  roleName?: string;
}

export type MergedStatEntry = StatEntry | CompanyStatEntry;

/**
 * Merges legacy manufacturerStats with Schema v3 companyStats.
 *
 * Priority rules:
 * 1. When same company exists in both, prefer companyStats (has role info)
 * 2. Filter out empty/null manufacturer entries
 * 3. Combine counts when same company has multiple roles in companyStats
 * 4. Sort by count descending
 *
 * @param manufacturerStats Legacy manufacturer stats (from Figure.manufacturer field)
 * @param companyStats Schema v3 company stats (from Figure.companyRoles array)
 * @returns Merged, deduplicated, sorted array of stats
 */
export function mergeCompanyStats(
  manufacturerStats?: StatEntry[] | null,
  companyStats?: CompanyStatEntry[] | null
): MergedStatEntry[] {
  // Handle null/undefined inputs
  const mfgStats = manufacturerStats ?? [];
  const coStats = companyStats ?? [];

  // If both empty, return empty array
  if (mfgStats.length === 0 && coStats.length === 0) {
    return [];
  }

  // If only manufacturerStats, filter and return
  if (coStats.length === 0) {
    return mfgStats
      .filter(s => s._id != null && s._id !== '')
      .sort((a, b) => b.count - a.count);
  }

  // If only companyStats, combine same companies and return
  if (mfgStats.length === 0) {
    return combineCompanyStats(coStats);
  }

  // Merge both: companyStats takes precedence
  const companyNameMap = new Map<string, MergedStatEntry>();

  // First, add all companyStats (these have role info, so they're preferred)
  for (const cs of coStats) {
    if (cs._id == null || cs._id === '') continue;

    if (companyNameMap.has(cs._id)) {
      // Same company with different role - accumulate count
      const existing = companyNameMap.get(cs._id)!;
      existing.count += cs.count;
      // Keep the Manufacturer role if it exists (most common role for filtering)
      if (cs.roleName === 'Manufacturer') {
        existing.roleName = 'Manufacturer';
      }
    } else {
      companyNameMap.set(cs._id, { ...cs });
    }
  }

  // Then, add manufacturerStats that aren't already in companyStats
  for (const ms of mfgStats) {
    if (ms._id == null || ms._id === '') continue;

    if (!companyNameMap.has(ms._id)) {
      companyNameMap.set(ms._id, { ...ms });
    }
    // If company already exists from companyStats, skip (prefer v3 data)
  }

  // Convert to array and sort by count descending
  return Array.from(companyNameMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Combines company stats entries with the same _id by summing counts.
 * Preserves Manufacturer role when present.
 */
function combineCompanyStats(stats: CompanyStatEntry[]): MergedStatEntry[] {
  const map = new Map<string, MergedStatEntry>();

  for (const s of stats) {
    if (s._id == null || s._id === '') continue;

    if (map.has(s._id)) {
      const existing = map.get(s._id)!;
      existing.count += s.count;
      if (s.roleName === 'Manufacturer') {
        existing.roleName = 'Manufacturer';
      }
    } else {
      map.set(s._id, { ...s });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * Gets the primary company name for display.
 * Prefers companyRoles (v3) over manufacturer (legacy).
 *
 * @param companyRoles Schema v3 company roles array
 * @param manufacturer Legacy manufacturer string
 * @returns Company name for display, or empty string if none
 */
export function getDisplayCompanyName(
  companyRoles?: ICompanyRole[],
  manufacturer?: string
): string {
  // Prefer v3 companyRoles if available
  if (companyRoles && companyRoles.length > 0) {
    // Find the Manufacturer role first, fall back to first company
    const manufacturerRole = companyRoles.find(cr => cr.roleName === 'Manufacturer');
    if (manufacturerRole?.companyName) {
      return manufacturerRole.companyName;
    }
    // Fall back to first company with a name
    const firstWithName = companyRoles.find(cr => cr.companyName);
    if (firstWithName?.companyName) {
      return firstWithName.companyName;
    }
  }

  // Fall back to legacy manufacturer
  return manufacturer || '';
}

/**
 * Gets all companies with their roles for detailed display.
 *
 * @param companyRoles Schema v3 company roles array
 * @param manufacturer Legacy manufacturer string (used if no v3 data)
 * @returns Array of {name, role} objects for display
 */
export function getDisplayCompanies(
  companyRoles?: ICompanyRole[],
  manufacturer?: string
): Array<{ name: string; role?: string }> {
  if (companyRoles && companyRoles.length > 0) {
    return companyRoles
      .filter(cr => cr.companyName)
      .map(cr => ({
        name: cr.companyName!,
        role: cr.roleName,
      }));
  }

  // Fall back to legacy manufacturer
  if (manufacturer) {
    return [{ name: manufacturer }];
  }

  return [];
}

/**
 * Gets all artists with their roles for display.
 *
 * @param artistRoles Schema v3 artist roles array
 * @returns Array of {name, role} objects for display
 */
export function getDisplayArtists(
  artistRoles?: IArtistRole[]
): Array<{ name: string; role?: string }> {
  if (!artistRoles || artistRoles.length === 0) {
    return [];
  }

  return artistRoles
    .filter(ar => ar.artistName)
    .map(ar => ({
      name: ar.artistName!,
      role: ar.roleName,
    }));
}
