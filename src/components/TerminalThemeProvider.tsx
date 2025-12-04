import React, { useEffect } from 'react';
import { useCustomTheme, terminalColors } from '../hooks/useCustomTheme';

interface TerminalThemeProviderProps {
  children: React.ReactNode;
}

// Dark mode colors - matches Chakra's gray scale
const darkModeColors = {
  bg: '#1A202C', // gray.800
  text: '#F7FAFC', // gray.50
};

const TerminalThemeProvider: React.FC<TerminalThemeProviderProps> = ({ children }) => {
  const { customTheme } = useCustomTheme();

  useEffect(() => {
    const STYLE_ID = 'terminal-theme-global-styles';
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    if (customTheme === 'terminal') {
      // Add terminal class to html element
      htmlElement.classList.add('terminal-theme');
      htmlElement.classList.remove('dark-theme');

      // Set body styles directly
      bodyElement.style.backgroundColor = terminalColors.bg;
      bodyElement.style.color = terminalColors.text;
      bodyElement.style.fontFamily = "'Courier New', Courier, monospace";

      // Inject global styles into document head
      let styleTag = document.getElementById(STYLE_ID) as HTMLStyleElement;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = STYLE_ID;
        document.head.appendChild(styleTag);
      }

      // Use requestAnimationFrame to apply styles after Chakra's render cycle
      requestAnimationFrame(() => {
        styleTag.textContent = `
          html.terminal-theme,
          html.terminal-theme body,
          html.terminal-theme #root {
            background-color: ${terminalColors.bg} !important;
            color: ${terminalColors.text} !important;
          }
          html.terminal-theme * {
            font-family: 'Courier New', Courier, monospace !important;
          }
          html.terminal-theme .chakra-card,
          html.terminal-theme [role="group"],
          html.terminal-theme [data-testid="layout"],
          html.terminal-theme div[class*="chakra"],
          html.terminal-theme section,
          html.terminal-theme main {
            background-color: ${terminalColors.cardBg} !important;
            border-color: ${terminalColors.border} !important;
            color: ${terminalColors.text} !important;
          }
          html.terminal-theme .chakra-button:hover {
            background-color: ${terminalColors.hover} !important;
          }
          html.terminal-theme .chakra-input,
          html.terminal-theme .chakra-textarea,
          html.terminal-theme .chakra-select,
          html.terminal-theme input,
          html.terminal-theme textarea,
          html.terminal-theme select {
            background-color: ${terminalColors.bg} !important;
            border-color: ${terminalColors.border} !important;
            color: ${terminalColors.text} !important;
          }
          html.terminal-theme .chakra-input::placeholder,
          html.terminal-theme .chakra-textarea::placeholder,
          html.terminal-theme .chakra-select::placeholder,
          html.terminal-theme input::placeholder,
          html.terminal-theme textarea::placeholder {
            color: ${terminalColors.textAlt} !important;
          }
          html.terminal-theme .chakra-heading,
          html.terminal-theme h1,
          html.terminal-theme h2,
          html.terminal-theme h3,
          html.terminal-theme h4,
          html.terminal-theme h5,
          html.terminal-theme h6 {
            color: ${terminalColors.textAlt} !important;
          }
          html.terminal-theme .chakra-link,
          html.terminal-theme a {
            color: ${terminalColors.text} !important;
          }
          html.terminal-theme .chakra-link:hover,
          html.terminal-theme a:hover {
            color: ${terminalColors.textAlt} !important;
          }
          html.terminal-theme .chakra-text,
          html.terminal-theme p,
          html.terminal-theme span,
          html.terminal-theme div {
            color: ${terminalColors.text} !important;
          }
        `;
      });
    } else if (customTheme === 'dark') {
      // Handle dark mode - set body background since static theme doesn't
      htmlElement.classList.remove('terminal-theme');
      htmlElement.classList.add('dark-theme');

      bodyElement.style.backgroundColor = darkModeColors.bg;
      bodyElement.style.color = darkModeColors.text;
      bodyElement.style.fontFamily = '';

      // Inject minimal dark mode styles
      let styleTag = document.getElementById(STYLE_ID) as HTMLStyleElement;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = STYLE_ID;
        document.head.appendChild(styleTag);
      }

      requestAnimationFrame(() => {
        styleTag.textContent = `
          html.dark-theme,
          html.dark-theme body,
          html.dark-theme #root {
            background-color: ${darkModeColors.bg} !important;
          }
        `;
      });
    } else {
      // Light mode - remove all custom styles
      htmlElement.classList.remove('terminal-theme');
      htmlElement.classList.remove('dark-theme');
      bodyElement.style.backgroundColor = '';
      bodyElement.style.color = '';
      bodyElement.style.fontFamily = '';

      // Remove global styles
      const styleTag = document.getElementById(STYLE_ID);
      if (styleTag) {
        styleTag.remove();
      }
    }

    // Cleanup on unmount
    return () => {
      htmlElement.classList.remove('terminal-theme');
      htmlElement.classList.remove('dark-theme');
      const styleTag = document.getElementById(STYLE_ID);
      if (styleTag) {
        styleTag.remove();
      }
    };
  }, [customTheme]);

  return <>{children}</>;
};

export default TerminalThemeProvider;
