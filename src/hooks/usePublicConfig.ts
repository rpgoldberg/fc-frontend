import { useQuery } from 'react-query';
import { getPublicConfig } from '../api';
import { SystemConfig } from '../types';

/**
 * Hook to fetch public configuration values from the backend.
 * These configs are cached and don't require authentication.
 *
 * @param key - The config key to fetch
 * @param options - Optional react-query options
 * @returns Query result with config data, loading state, and error
 */
export const usePublicConfig = (key: string, options?: { enabled?: boolean }) => {
  return useQuery<SystemConfig | null>(
    ['publicConfig', key],
    () => getPublicConfig(key),
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      retry: 1, // Only retry once on failure
      enabled: options?.enabled !== false,
    }
  );
};

/**
 * Hook to fetch multiple public configs at once.
 * Useful for components that need both script and instructions.
 *
 * @param keys - Array of config keys to fetch
 * @returns Object with configs keyed by their key names
 */
export const usePublicConfigs = (keys: string[]) => {
  // Use individual queries
  const results = keys.map(key =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery<SystemConfig | null>(
      ['publicConfig', key],
      () => getPublicConfig(key),
      {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
        retry: 1,
      }
    )
  );

  const configs: Record<string, SystemConfig | null | undefined> = {};
  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);

  keys.forEach((key, index) => {
    configs[key] = results[index].data;
  });

  return { configs, isLoading, isError };
};

export default usePublicConfig;
