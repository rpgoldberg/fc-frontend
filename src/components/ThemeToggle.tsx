import React from 'react';
import { IconButton, Tooltip, Icon, ButtonGroup } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { FaTerminal } from 'react-icons/fa';
import { useCustomTheme } from '../hooks/useCustomTheme';

const ThemeToggle: React.FC = () => {
  const { customTheme, setCustomTheme } = useCustomTheme();

  return (
    <ButtonGroup isAttached size="sm" variant="outline">
      <Tooltip label="Light mode" placement="bottom">
        <IconButton
          aria-label="Light mode"
          icon={<SunIcon />}
          onClick={() => setCustomTheme('light')}
          colorScheme={customTheme === 'light' ? 'blue' : 'gray'}
          variant={customTheme === 'light' ? 'solid' : 'ghost'}
        />
      </Tooltip>
      <Tooltip label="Dark mode" placement="bottom">
        <IconButton
          aria-label="Dark mode"
          icon={<MoonIcon />}
          onClick={() => setCustomTheme('dark')}
          colorScheme={customTheme === 'dark' ? 'blue' : 'gray'}
          variant={customTheme === 'dark' ? 'solid' : 'ghost'}
        />
      </Tooltip>
      <Tooltip label="Terminal mode" placement="bottom">
        <IconButton
          aria-label="Terminal mode"
          icon={<Icon as={FaTerminal} />}
          onClick={() => setCustomTheme('terminal')}
          colorScheme={customTheme === 'terminal' ? 'green' : 'gray'}
          variant={customTheme === 'terminal' ? 'solid' : 'ghost'}
          color={customTheme === 'terminal' ? '#00ff00' : undefined}
        />
      </Tooltip>
    </ButtonGroup>
  );
};

export default ThemeToggle;
