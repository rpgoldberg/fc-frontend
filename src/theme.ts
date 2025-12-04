import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { ResolvedTheme } from './stores/themeStore';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Terminal theme colors - retro green on black
const terminalColors = {
  bg: '#0a0a0a',
  text: '#00ff00',
  textDim: '#00cc00',
  accent: '#00ff66',
  border: '#00aa00',
  highlight: '#003300',
};

// Create theme based on resolved theme type
export const createTheme = (resolvedTheme: ResolvedTheme) => {
  const isTerminal = resolvedTheme === 'terminal';
  const isDark = resolvedTheme === 'dark' || isTerminal;

  return extendTheme({
    config: {
      ...config,
      initialColorMode: isDark ? 'dark' : 'light',
    },
    colors: {
      brand: {
        50: isTerminal ? '#003300' : '#e6f7ff',
        100: isTerminal ? '#004400' : '#bae3ff',
        200: isTerminal ? '#005500' : '#7cc4fa',
        300: isTerminal ? '#006600' : '#47a3f3',
        400: isTerminal ? '#008800' : '#2186eb',
        500: isTerminal ? '#00aa00' : '#0967d2',
        600: isTerminal ? '#00cc00' : '#0552b5',
        700: isTerminal ? '#00dd00' : '#03449e',
        800: isTerminal ? '#00ee00' : '#01337d',
        900: isTerminal ? '#00ff00' : '#002159',
      },
      terminal: terminalColors,
    },
    fonts: {
      heading: isTerminal ? '"Courier New", Courier, monospace' : 'Inter, sans-serif',
      body: isTerminal ? '"Courier New", Courier, monospace' : 'Inter, sans-serif',
    },
    styles: {
      global: {
        body: {
          bg: isTerminal ? terminalColors.bg : (isDark ? 'gray.900' : 'white'),
          color: isTerminal ? terminalColors.text : (isDark ? 'gray.50' : 'gray.900'),
        },
        '*::selection': isTerminal ? {
          bg: terminalColors.text,
          color: terminalColors.bg,
        } : {},
      },
    },
    components: {
      Button: {
        defaultProps: {
          colorScheme: 'brand',
        },
        variants: isTerminal ? {
          solid: {
            bg: terminalColors.text,
            color: terminalColors.bg,
            _hover: {
              bg: terminalColors.accent,
            },
          },
          outline: {
            borderColor: terminalColors.text,
            color: terminalColors.text,
            _hover: {
              bg: terminalColors.highlight,
            },
          },
        } : {},
      },
      Card: isTerminal ? {
        baseStyle: {
          container: {
            bg: terminalColors.highlight,
            borderColor: terminalColors.border,
            borderWidth: '1px',
          },
        },
      } : {},
      Input: isTerminal ? {
        variants: {
          outline: {
            field: {
              borderColor: terminalColors.border,
              bg: terminalColors.bg,
              color: terminalColors.text,
              _focus: {
                borderColor: terminalColors.text,
                boxShadow: `0 0 0 1px ${terminalColors.text}`,
              },
              _placeholder: {
                color: terminalColors.textDim,
              },
            },
          },
        },
      } : {},
      Select: isTerminal ? {
        variants: {
          outline: {
            field: {
              borderColor: terminalColors.border,
              bg: terminalColors.bg,
              color: terminalColors.text,
              _focus: {
                borderColor: terminalColors.text,
              },
            },
          },
        },
      } : {},
      Menu: isTerminal ? {
        baseStyle: {
          list: {
            bg: terminalColors.bg,
            borderColor: terminalColors.border,
          },
          item: {
            bg: terminalColors.bg,
            color: terminalColors.text,
            _hover: {
              bg: terminalColors.highlight,
            },
            _focus: {
              bg: terminalColors.highlight,
            },
          },
        },
      } : {},
    },
  });
};

// Default theme (light mode)
const theme = createTheme('light');

export default theme;
