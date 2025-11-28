import { useEffect, useMemo } from 'react';
import { useColorMode } from '@chakra-ui/react';
import { useThemeStore, getResolvedTheme, ResolvedTheme } from '../stores/themeStore';
import { ColorProfile } from '../types';

export type CustomTheme = ResolvedTheme;

export const useCustomTheme = () => {
  const { setColorMode } = useColorMode();
  const { colorProfile, setColorProfile } = useThemeStore();

  // For 'surprise', we resolve to an actual theme once per session
  const resolvedTheme = useMemo(() => getResolvedTheme(colorProfile), [colorProfile]);

  useEffect(() => {
    // Keep Chakra color mode in sync (terminal uses dark as base)
    if (resolvedTheme === 'terminal') {
      setColorMode('dark');
    } else {
      setColorMode(resolvedTheme);
    }
  }, [resolvedTheme, setColorMode]);

  const cycleTheme = () => {
    const themes: ColorProfile[] = ['light', 'dark', 'terminal', 'surprise'];
    const currentIndex = themes.indexOf(colorProfile);
    const nextIndex = (currentIndex + 1) % themes.length;
    setColorProfile(themes[nextIndex]);
  };

  // Expose both the stored profile and the resolved theme
  return {
    customTheme: resolvedTheme, // The actual theme being applied
    colorProfile, // The stored preference (including 'surprise')
    cycleTheme,
    setCustomTheme: setColorProfile, // Set the stored preference
  };
};

// Terminal theme color palette
export const terminalColors = {
  bg: '#0a0a0a', // Almost black background
  text: '#00ff00', // Matrix green
  textAlt: '#ff8800', // Amber/orange
  border: '#004400',
  cardBg: '#1a1a1a',
  hover: '#003300',
  success: '#00ff00',
  error: '#ff4444',
  warning: '#ff8800',
  info: '#00aaff',
};
