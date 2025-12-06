import { act, renderHook } from '@testing-library/react';
import { useThemeStore, THEME_OPTIONS } from '../themeStore';

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

    it('should update color profile to tokyonight', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setColorProfile('tokyonight');
      });

      expect(result.current.colorProfile).toBe('tokyonight');
    });

    it('should update color profile to nord', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setColorProfile('nord');
      });

      expect(result.current.colorProfile).toBe('nord');
    });

    it('should update color profile to dracula', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setColorProfile('dracula');
      });

      expect(result.current.colorProfile).toBe('dracula');
    });

    it('should update color profile to solarized', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setColorProfile('solarized');
      });

      expect(result.current.colorProfile).toBe('solarized');
    });

    it('should update color profile to cyberpunk', () => {
      const { result } = renderHook(() => useThemeStore());

      act(() => {
        result.current.setColorProfile('cyberpunk');
      });

      expect(result.current.colorProfile).toBe('cyberpunk');
    });
  });

  describe('THEME_OPTIONS', () => {
    it('should have 8 theme options', () => {
      expect(THEME_OPTIONS).toHaveLength(8);
    });

    it('should include all color profiles', () => {
      const values = THEME_OPTIONS.map(opt => opt.value);
      expect(values).toContain('light');
      expect(values).toContain('dark');
      expect(values).toContain('terminal');
      expect(values).toContain('tokyonight');
      expect(values).toContain('nord');
      expect(values).toContain('dracula');
      expect(values).toContain('solarized');
      expect(values).toContain('cyberpunk');
    });

    it('should have labels for all options', () => {
      THEME_OPTIONS.forEach(option => {
        expect(option.label).toBeTruthy();
        expect(typeof option.label).toBe('string');
      });
    });

    it('should have descriptions for all options', () => {
      THEME_OPTIONS.forEach(option => {
        expect(option.description).toBeTruthy();
        expect(typeof option.description).toBe('string');
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
