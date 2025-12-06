import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { clearSessionCookies } from '../utils/crypto';
import { useThemeStore } from './themeStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => {
        // Sync colorProfile to theme store if user has one
        if (user?.colorProfile) {
          useThemeStore.getState().setColorProfile(user.colorProfile);
        }
        set({ user, isAuthenticated: !!user });
      },
      logout: () => {
        // Clear session cookies on logout (preserves persistent cookies)
        clearSessionCookies();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
