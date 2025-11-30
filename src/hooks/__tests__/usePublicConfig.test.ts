import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import React from 'react';
import { usePublicConfig, usePublicConfigs } from '../usePublicConfig';
import * as api from '../../api';

// Mock the API module
jest.mock('../../api', () => ({
  getPublicConfig: jest.fn(),
}));

const mockedGetPublicConfig = api.getPublicConfig as jest.MockedFunction<typeof api.getPublicConfig>;

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePublicConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch a public config by key', async () => {
    const mockConfig = {
      key: 'mfc_cookie_script',
      value: 'javascript:(function(){})();',
      type: 'script' as const,
      description: 'Test script',
      isPublic: true,
    };

    mockedGetPublicConfig.mockResolvedValue(mockConfig);

    const { result } = renderHook(() => usePublicConfig('mfc_cookie_script'), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockConfig);
    expect(mockedGetPublicConfig).toHaveBeenCalledWith('mfc_cookie_script');
  });

  it('should return null when config is not found', async () => {
    mockedGetPublicConfig.mockResolvedValue(null);

    const { result } = renderHook(() => usePublicConfig('nonexistent_key'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(() => usePublicConfig('test_key', { enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isIdle).toBe(true);
    expect(mockedGetPublicConfig).not.toHaveBeenCalled();
  });
});

describe('usePublicConfigs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch multiple configs at once', async () => {
    const mockScript = {
      key: 'mfc_cookie_script',
      value: 'javascript:(function(){})();',
      type: 'script' as const,
      description: 'Test script',
      isPublic: true,
    };

    const mockInstructions = {
      key: 'mfc_cookie_instructions',
      value: '## Instructions\\nStep 1...',
      type: 'markdown' as const,
      description: 'Test instructions',
      isPublic: true,
    };

    mockedGetPublicConfig.mockImplementation(async (key: string) => {
      if (key === 'mfc_cookie_script') return mockScript;
      if (key === 'mfc_cookie_instructions') return mockInstructions;
      return null;
    });

    const { result } = renderHook(
      () => usePublicConfigs(['mfc_cookie_script', 'mfc_cookie_instructions']),
      { wrapper: createWrapper() }
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for all data
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.configs.mfc_cookie_script).toEqual(mockScript);
    expect(result.current.configs.mfc_cookie_instructions).toEqual(mockInstructions);
    expect(mockedGetPublicConfig).toHaveBeenCalledTimes(2);
  });

  it('should handle partial config availability', async () => {
    const mockScript = {
      key: 'mfc_cookie_script',
      value: 'javascript:(function(){})();',
      type: 'script' as const,
      description: 'Test script',
      isPublic: true,
    };

    mockedGetPublicConfig.mockImplementation(async (key: string) => {
      if (key === 'mfc_cookie_script') return mockScript;
      return null; // instructions not found
    });

    const { result } = renderHook(
      () => usePublicConfigs(['mfc_cookie_script', 'mfc_cookie_instructions']),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.configs.mfc_cookie_script).toEqual(mockScript);
    expect(result.current.configs.mfc_cookie_instructions).toBeNull();
  });
});
