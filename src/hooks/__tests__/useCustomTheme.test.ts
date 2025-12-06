import { renderHook, act } from '@testing-library/react';
import { useCustomTheme } from '../useCustomTheme';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import * as api from '../../api';

// Mock the API
jest.mock('../../api', () => ({
  updateUserProfile: jest.fn(),
}));

// Mock Chakra's useColorMode
jest.mock('@chakra-ui/react', () => ({
  useColorMode: () => ({
    setColorMode: jest.fn(),
  }),
}));

describe('useCustomTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset stores
    useThemeStore.setState({ colorProfile: 'light' });
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  describe('basic theme functionality', () => {
    it('should return current color profile', () => {
      const { result } = renderHook(() => useCustomTheme());

      expect(result.current.colorProfile).toBe('light');
    });

    it('should set custom theme', () => {
      const { result } = renderHook(() => useCustomTheme());

      act(() => {
        result.current.setCustomTheme('terminal');
      });

      expect(result.current.colorProfile).toBe('terminal');
    });

    it('should set tokyonight theme', () => {
      const { result } = renderHook(() => useCustomTheme());

      act(() => {
        result.current.setCustomTheme('tokyonight');
      });

      expect(result.current.colorProfile).toBe('tokyonight');
    });

    it('should set nord theme', () => {
      const { result } = renderHook(() => useCustomTheme());

      act(() => {
        result.current.setCustomTheme('nord');
      });

      expect(result.current.colorProfile).toBe('nord');
    });

    it('should set dracula theme', () => {
      const { result } = renderHook(() => useCustomTheme());

      act(() => {
        result.current.setCustomTheme('dracula');
      });

      expect(result.current.colorProfile).toBe('dracula');
    });

    it('should set solarized theme', () => {
      const { result } = renderHook(() => useCustomTheme());

      act(() => {
        result.current.setCustomTheme('solarized');
      });

      expect(result.current.colorProfile).toBe('solarized');
    });

    it('should set cyberpunk theme', () => {
      const { result } = renderHook(() => useCustomTheme());

      act(() => {
        result.current.setCustomTheme('cyberpunk');
      });

      expect(result.current.colorProfile).toBe('cyberpunk');
    });
  });

  describe('API sync when authenticated', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      email: 'test@example.com',
      isAdmin: false,
      token: 'mock-jwt-token',
    };

    beforeEach(() => {
      // Set authenticated user
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      (api.updateUserProfile as jest.Mock).mockResolvedValue({ ...mockUser, colorProfile: 'dark' });
    });

    it('should call updateUserProfile when authenticated user changes theme via setCustomTheme', async () => {
      const { result } = renderHook(() => useCustomTheme());

      await act(async () => {
        result.current.setCustomTheme('dark');
      });

      expect(api.updateUserProfile).toHaveBeenCalledWith({ colorProfile: 'dark' });
    });

    it('should sync terminal theme to backend', async () => {
      const { result } = renderHook(() => useCustomTheme());

      await act(async () => {
        result.current.setCustomTheme('terminal');
      });

      expect(api.updateUserProfile).toHaveBeenCalledWith({ colorProfile: 'terminal' });
    });

    it('should sync tokyonight theme to backend', async () => {
      const { result } = renderHook(() => useCustomTheme());

      await act(async () => {
        result.current.setCustomTheme('tokyonight');
      });

      expect(api.updateUserProfile).toHaveBeenCalledWith({ colorProfile: 'tokyonight' });
    });

    it('should sync cyberpunk theme to backend', async () => {
      const { result } = renderHook(() => useCustomTheme());

      await act(async () => {
        result.current.setCustomTheme('cyberpunk');
      });

      expect(api.updateUserProfile).toHaveBeenCalledWith({ colorProfile: 'cyberpunk' });
    });
  });

  describe('no API sync when not authenticated', () => {
    it('should NOT call updateUserProfile when user is not authenticated', async () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });

      const { result } = renderHook(() => useCustomTheme());

      await act(async () => {
        result.current.setCustomTheme('dark');
      });

      expect(api.updateUserProfile).not.toHaveBeenCalled();
    });

    it('should still update local theme when not authenticated', async () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });

      const { result } = renderHook(() => useCustomTheme());

      await act(async () => {
        result.current.setCustomTheme('terminal');
      });

      expect(result.current.colorProfile).toBe('terminal');
      expect(api.updateUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('API error handling', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      email: 'test@example.com',
      isAdmin: false,
      token: 'mock-jwt-token',
    };

    beforeEach(() => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    });

    it('should still update local theme when API call fails', async () => {
      (api.updateUserProfile as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCustomTheme());

      await act(async () => {
        result.current.setCustomTheme('dark');
      });

      // Local theme should still change even if API fails
      expect(result.current.colorProfile).toBe('dark');
    });

    it('should not throw when API returns error', async () => {
      (api.updateUserProfile as jest.Mock).mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useCustomTheme());

      // Should not throw
      await expect(
        act(async () => {
          result.current.setCustomTheme('terminal');
        })
      ).resolves.not.toThrow();
    });
  });
});
