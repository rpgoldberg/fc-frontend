import { act, renderHook } from '@testing-library/react';
import { useThemeStore, getResolvedTheme, THEME_OPTIONS } from '../themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const { result } = renderHook(() => useThemeStore());
    act(() => {
      result.current.setColorProfile('light');
    });
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should default to light theme', () => {
      const { result } = renderHook(() => useThemeStore());
      expect(result.current.colorProfile).toBe('light');
    });
  });

  describe('setColorProfile', () => {
    it('should update color profile to dark', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setColorProfile('dark');
      });

      expect(result.current.colorProfile).toBe('dark');
    });

    it('should update color profile to terminal', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setColorProfile('terminal');
      });

      expect(result.current.colorProfile).toBe('terminal');
    });

    it('should update color profile to surprise', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setColorProfile('surprise');
      });

      expect(result.current.colorProfile).toBe('surprise');
    });
  });

  describe('getResolvedTheme', () => {
    it('should return light for light profile', () => {
      expect(getResolvedTheme('light')).toBe('light');
    });

    it('should return dark for dark profile', () => {
      expect(getResolvedTheme('dark')).toBe('dark');
    });

    it('should return terminal for terminal profile', () => {
      expect(getResolvedTheme('terminal')).toBe('terminal');
    });

    it('should return a valid theme for surprise profile', () => {
      const result = getResolvedTheme('surprise');
      expect(['light', 'dark', 'terminal']).toContain(result);
    });

    it('should return random themes for surprise (statistical test)', () => {
      const results = new Set<string>();
      // Run enough times to be statistically likely to get all options
      for (let i = 0; i < 50; i++) {
        results.add(getResolvedTheme('surprise'));
      }
      // Should get at least 2 different themes
      expect(results.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('THEME_OPTIONS', () => {
    it('should have 4 theme options', () => {
      expect(THEME_OPTIONS).toHaveLength(4);
    });

    it('should include all color profiles', () => {
      const values = THEME_OPTIONS.map(opt => opt.value);
      expect(values).toContain('light');
      expect(values).toContain('dark');
      expect(values).toContain('terminal');
      expect(values).toContain('surprise');
    });

    it('should have labels for all options', () => {
      THEME_OPTIONS.forEach(option => {
        expect(option.label).toBeTruthy();
        expect(typeof option.label).toBe('string');
      });
    });
  });

  describe('persistence', () => {
    it('should maintain theme state across hook re-renders', () => {
      // Set the theme in one hook instance
      const { result: result1 } = renderHook(() => useThemeStore());
      act(() => {
        result1.current.setColorProfile('terminal');
      });

      // Verify another hook instance sees the same state
      const { result: result2 } = renderHook(() => useThemeStore());
      expect(result2.current.colorProfile).toBe('terminal');
    });
  });
});
