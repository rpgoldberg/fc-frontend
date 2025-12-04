import React from 'react';
import { IconButton, Tooltip, Icon, ButtonGroup } from '@chakra-ui/react';
import { MoonIcon, SunIcon, QuestionIcon } from '@chakra-ui/icons';
import { FaTerminal } from 'react-icons/fa';
import { useCustomTheme } from '../hooks/useCustomTheme';

const ThemeToggle: React.FC = () => {
  const { customTheme, colorProfile, setCustomTheme } = useCustomTheme();

  return (
    <ButtonGroup isAttached size="sm" variant="outline">
      <Tooltip label="Light mode" placement="bottom">
        <IconButton
          aria-label="Light mode"
          icon={<SunIcon />}
          onClick={() => setCustomTheme('light')}
          colorScheme={colorProfile === 'light' ? 'blue' : 'gray'}
          variant={colorProfile === 'light' ? 'solid' : 'ghost'}
        />
      </Tooltip>
      <Tooltip label="Dark mode" placement="bottom">
        <IconButton
          aria-label="Dark mode"
          icon={<MoonIcon />}
          onClick={() => setCustomTheme('dark')}
          colorScheme={colorProfile === 'dark' ? 'blue' : 'gray'}
          variant={colorProfile === 'dark' ? 'solid' : 'ghost'}
        />
      </Tooltip>
      <Tooltip label="Terminal mode" placement="bottom">
        <IconButton
          aria-label="Terminal mode"
          icon={<Icon as={FaTerminal} />}
          onClick={() => setCustomTheme('terminal')}
          colorScheme={colorProfile === 'terminal' ? 'green' : 'gray'}
          variant={colorProfile === 'terminal' ? 'solid' : 'ghost'}
          color={customTheme === 'terminal' ? '#00ff00' : undefined}
        />
      </Tooltip>
      <Tooltip label="Surprise me! (random theme)" placement="bottom">
        <IconButton
          aria-label="Surprise mode"
          icon={<QuestionIcon />}
          onClick={() => setCustomTheme('surprise')}
          colorScheme={colorProfile === 'surprise' ? 'purple' : 'gray'}
          variant={colorProfile === 'surprise' ? 'solid' : 'ghost'}
        />
      </Tooltip>
    </ButtonGroup>
  );
};

export default ThemeToggle;
