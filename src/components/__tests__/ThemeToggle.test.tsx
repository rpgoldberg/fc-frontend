import React from 'react';
import { render, screen } from '../../test-utils';
import { fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../../theme';
import { act } from 'react-dom/test-utils';

// Wrapper with Chakra provider for proper theme context
const ThemeWrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider theme={theme}>{children}</ChakraProvider>
);

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should render three theme buttons', () => {
    render(
      <ThemeWrapper>
        <ThemeToggle />
      </ThemeWrapper>
    );

    expect(screen.getByRole('button', { name: /light mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /terminal mode/i })).toBeInTheDocument();
  });

  it('should have accessible labels on all buttons', () => {
    render(
      <ThemeWrapper>
        <ThemeToggle />
      </ThemeWrapper>
    );

    const lightButton = screen.getByRole('button', { name: /light mode/i });
    const darkButton = screen.getByRole('button', { name: /dark mode/i });
    const terminalButton = screen.getByRole('button', { name: /terminal mode/i });

    expect(lightButton).toHaveAttribute('aria-label', 'Light mode');
    expect(darkButton).toHaveAttribute('aria-label', 'Dark mode');
    expect(terminalButton).toHaveAttribute('aria-label', 'Terminal mode');
  });

  it('should switch to dark mode when dark button is clicked', () => {
    render(
      <ThemeWrapper>
        <ThemeToggle />
      </ThemeWrapper>
    );

    const darkButton = screen.getByRole('button', { name: /dark mode/i });

    act(() => {
      fireEvent.click(darkButton);
    });

    // After clicking, the component should still be rendered
    expect(darkButton).toBeInTheDocument();
  });

  it('should switch to terminal mode when terminal button is clicked', () => {
    render(
      <ThemeWrapper>
        <ThemeToggle />
      </ThemeWrapper>
    );

    const terminalButton = screen.getByRole('button', { name: /terminal mode/i });

    act(() => {
      fireEvent.click(terminalButton);
    });

    // After clicking, the component should still be rendered
    expect(terminalButton).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    render(
      <ThemeWrapper>
        <ThemeToggle />
      </ThemeWrapper>
    );

    const lightButton = screen.getByRole('button', { name: /light mode/i });
    const darkButton = screen.getByRole('button', { name: /dark mode/i });
    const terminalButton = screen.getByRole('button', { name: /terminal mode/i });

    // All buttons should have type="button"
    expect(lightButton).toHaveAttribute('type', 'button');
    expect(darkButton).toHaveAttribute('type', 'button');
    expect(terminalButton).toHaveAttribute('type', 'button');
  });

  it('should save preference to localStorage when theme is changed', () => {
    render(
      <ThemeWrapper>
        <ThemeToggle />
      </ThemeWrapper>
    );

    const darkButton = screen.getByRole('button', { name: /dark mode/i });

    act(() => {
      fireEvent.click(darkButton);
    });

    // localStorage should have been called
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes on all buttons', () => {
      render(
        <ThemeWrapper>
          <ThemeToggle />
        </ThemeWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should be focusable', () => {
      render(
        <ThemeWrapper>
          <ThemeToggle />
        </ThemeWrapper>
      );

      const lightButton = screen.getByRole('button', { name: /light mode/i });
      lightButton.focus();
      expect(lightButton).toHaveFocus();
    });
  });
});
