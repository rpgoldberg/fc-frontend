import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ColorProfile } from '../types';

export interface ThemeOption {
  value: ColorProfile;
  label: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', description: 'Clean, bright interface' },
  { value: 'dark', label: 'Dark', description: 'Easy on the eyes' },
  { value: 'terminal', label: 'Terminal', description: 'Retro CRT with scanlines' },
  { value: 'tokyonight', label: 'Tokyo Night', description: 'Downtown Tokyo at night' },
  { value: 'nord', label: 'Nord', description: 'Arctic, north-bluish palette' },
  { value: 'dracula', label: 'Dracula', description: 'Gothic elegance' },
  { value: 'solarized', label: 'Solarized', description: 'Precision colors' },
  { value: 'cyberpunk', label: 'Cyberpunk', description: 'Neon pink & cyan' },
];

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
