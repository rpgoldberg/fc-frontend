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
  surpriseVersion: number; // Increment to force re-randomization
  setColorProfile: (profile: ColorProfile) => void;
  triggerSurpriseReroll: () => void; // Force a new random theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorProfile: 'light',
      surpriseVersion: 0,
      setColorProfile: (profile) => {
        const currentProfile = get().colorProfile;
        // If clicking surprise while already on surprise, trigger reroll
        if (profile === 'surprise' && currentProfile === 'surprise') {
          set((state) => ({ surpriseVersion: state.surpriseVersion + 1 }));
        } else {
          set({ colorProfile: profile });
        }
      },
      triggerSurpriseReroll: () => set((state) => ({ surpriseVersion: state.surpriseVersion + 1 })),
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ colorProfile: state.colorProfile }), // Don't persist surpriseVersion
    }
  )
);
