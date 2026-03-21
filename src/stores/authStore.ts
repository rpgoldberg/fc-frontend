/**
 * Auth Store - Desktop frontend configuration
 *
 * Uses shared auth store from fc-shared, configured with
 * desktop-specific side effects (cookie clearing, theme sync).
 */
import { configureAuthStore, useAuthStore } from '@figurecollecting/fc-shared';
import { clearSessionCookies } from '../utils/crypto';
import { useThemeStore } from './themeStore';

// Configure platform-specific callbacks for the shared auth store
configureAuthStore({
  onLogout: (userId) => {
    clearSessionCookies(userId);
  },
  onUserSet: (user) => {
    if (user?.colorProfile) {
      useThemeStore.getState().setColorProfile(user.colorProfile);
    }
  },
});

export { useAuthStore };
