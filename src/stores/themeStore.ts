import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ColorProfile } from '../types';

export type ResolvedTheme = 'light' | 'dark' | 'terminal';

export interface ThemeOption {
  value: ColorProfile;
  label: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', description: 'Clean, bright interface' },
  { value: 'dark', label: 'Dark', description: 'Easy on the eyes' },
  { value: 'terminal', label: 'Terminal', description: 'Retro green on black' },
  { value: 'surprise', label: 'Surprise Me!', description: 'Random theme each session' },
];

/**
 * Resolves the actual theme to use based on the color profile.
 * For 'surprise', randomly picks from light, dark, or terminal.
 */
export const getResolvedTheme = (profile: ColorProfile): ResolvedTheme => {
  if (profile === 'surprise') {
    const themes: ResolvedTheme[] = ['light', 'dark', 'terminal'];
    return themes[Math.floor(Math.random() * themes.length)];
  }
  return profile;
};

interface ThemeState {
  colorProfile: ColorProfile;
  setColorProfile: (profile: ColorProfile) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorProfile: 'light',
      setColorProfile: (profile) => set({ colorProfile: profile }),
    }),
    {
      name: 'theme-storage',
    }
  )
);
