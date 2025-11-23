import { useState, useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';

export type CustomTheme = 'light' | 'dark' | 'terminal';

const THEME_STORAGE_KEY = 'custom-theme';

export const useCustomTheme = () => {
  const { setColorMode } = useColorMode();
  const [customTheme, setCustomTheme] = useState<CustomTheme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as CustomTheme) || 'light';
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, customTheme);
    // Keep Chakra color mode in sync (terminal uses dark as base)
    if (customTheme === 'terminal') {
      setColorMode('dark');
    } else {
      setColorMode(customTheme);
    }
  }, [customTheme, setColorMode]);

  const cycleTheme = () => {
    setCustomTheme((current) => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'terminal';
      return 'light';
    });
  };

  return { customTheme, cycleTheme, setCustomTheme };
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
