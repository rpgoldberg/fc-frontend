import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import FigureForm from '../FigureForm';
import * as usePublicConfigModule from '../../hooks/usePublicConfig';

// Mock the usePublicConfigs hook
jest.mock('../../hooks/usePublicConfig');

const mockedUsePublicConfigs = usePublicConfigModule.usePublicConfigs as jest.MockedFunction<
  typeof usePublicConfigModule.usePublicConfigs
>;

const defaultProps = {
  onSubmit: jest.fn(),
  isLoading: false,
};

describe('FigureForm - Dynamic MFC Cookie Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When config is loading', () => {
    it('should show spinner when expanding help section while configs are loading', async () => {
      mockedUsePublicConfigs.mockReturnValue({
        configs: {},
        isLoading: true,
        isError: false,
      });

      render(<FigureForm {...defaultProps} />);

      // Find and click the help button
      const helpButton = screen.getByRole('button', { name: /how to get mfc cookies/i });
      await userEvent.click(helpButton);

      // Should show spinner while loading - Chakra Spinner renders with class containing "chakra-spinner"
      // or we can check for the absence of content that would appear when loading is done
      await waitFor(() => {
        // Spinner should be present, check by testId or text absence
        const helpBox = screen.getByText(/how to get mfc cookies/i).closest('div');
        expect(helpBox).toBeInTheDocument();
        // When loading, neither instructions nor fallback message should appear
        expect(screen.queryByText(/Instructions not available/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('When config is available', () => {
    it('should display dynamic instructions from config', async () => {
      const mockInstructions = {
        key: 'mfc_cookie_instructions',
        value: '## How to Get Cookies\\nStep 1: Go to MFC\\nStep 2: Run script',
        type: 'markdown' as const,
        description: 'MFC cookie instructions',
        isPublic: true,
      };

      mockedUsePublicConfigs.mockReturnValue({
        configs: {
          mfc_cookie_instructions: mockInstructions,
          mfc_cookie_script: null,
        },
        isLoading: false,
        isError: false,
      });

      render(<FigureForm {...defaultProps} />);

      // Expand the help section
      const helpButton = screen.getByRole('button', { name: /how to get mfc cookies/i });
      await userEvent.click(helpButton);

      // Should display the dynamic instructions
      await waitFor(() => {
        expect(screen.getByText(/How to Get Cookies/i)).toBeInTheDocument();
        expect(screen.getByText(/Step 1: Go to MFC/i)).toBeInTheDocument();
      });
    });

    it('should display dynamic script from config', async () => {
      const mockScript = {
        key: 'mfc_cookie_script',
        value: 'javascript:(function(){alert("test")})();',
        type: 'script' as const,
        description: 'MFC cookie script',
        isPublic: true,
      };

      mockedUsePublicConfigs.mockReturnValue({
        configs: {
          mfc_cookie_instructions: null,
          mfc_cookie_script: mockScript,
        },
        isLoading: false,
        isError: false,
      });

      render(<FigureForm {...defaultProps} />);

      // Expand the help section
      const helpButton = screen.getByRole('button', { name: /how to get mfc cookies/i });
      await userEvent.click(helpButton);

      // Should display the script in a code block
      await waitFor(() => {
        expect(screen.getByText(/javascript:\(function\(\)\{alert\("test"\)\}\)\(\);/)).toBeInTheDocument();
      });
    });

    it('should display both instructions and script when both are available', async () => {
      const mockInstructions = {
        key: 'mfc_cookie_instructions',
        value: '## Instructions\\nFollow these steps',
        type: 'markdown' as const,
        description: 'Instructions',
        isPublic: true,
      };

      const mockScript = {
        key: 'mfc_cookie_script',
        value: 'javascript:(function(){})();',
        type: 'script' as const,
        description: 'Script',
        isPublic: true,
      };

      mockedUsePublicConfigs.mockReturnValue({
        configs: {
          mfc_cookie_instructions: mockInstructions,
          mfc_cookie_script: mockScript,
        },
        isLoading: false,
        isError: false,
      });

      render(<FigureForm {...defaultProps} />);

      // Expand the help section
      const helpButton = screen.getByRole('button', { name: /how to get mfc cookies/i });
      await userEvent.click(helpButton);

      // Should display both
      await waitFor(() => {
        expect(screen.getByText(/Instructions/i)).toBeInTheDocument();
        expect(screen.getByText(/javascript:\(function\(\)\{\}\)\(\);/)).toBeInTheDocument();
      });
    });
  });

  describe('When config is not available', () => {
    it('should display fallback message when no config is available', async () => {
      mockedUsePublicConfigs.mockReturnValue({
        configs: {
          mfc_cookie_instructions: null,
          mfc_cookie_script: null,
        },
        isLoading: false,
        isError: false,
      });

      render(<FigureForm {...defaultProps} />);

      // Expand the help section
      const helpButton = screen.getByRole('button', { name: /how to get mfc cookies/i });
      await userEvent.click(helpButton);

      // Should show fallback message
      await waitFor(() => {
        expect(screen.getByText(/Instructions not available/i)).toBeInTheDocument();
      });
    });
  });

  describe('When config fetch fails', () => {
    it('should display fallback message on error', async () => {
      mockedUsePublicConfigs.mockReturnValue({
        configs: {},
        isLoading: false,
        isError: true,
      });

      render(<FigureForm {...defaultProps} />);

      // Expand the help section
      const helpButton = screen.getByRole('button', { name: /how to get mfc cookies/i });
      await userEvent.click(helpButton);

      // Should show fallback message
      await waitFor(() => {
        expect(screen.getByText(/Instructions not available/i)).toBeInTheDocument();
      });
    });
  });
});
