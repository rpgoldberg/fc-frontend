import React from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Icon,
  HStack,
  Text,
  Box,
} from '@chakra-ui/react';
import { ChevronDownIcon, MoonIcon, SunIcon, StarIcon } from '@chakra-ui/icons';
import { FaTerminal, FaDragon, FaRobot, FaSnowflake } from 'react-icons/fa';
import { TbBrandRadixUi } from 'react-icons/tb';
import { useCustomTheme, getThemeColors } from '../hooks/useCustomTheme';
import { THEME_OPTIONS } from '../stores/themeStore';
import { ColorProfile } from '../types';

// Icon mapping for each theme
const themeIcons: Record<ColorProfile, React.ReactElement> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  terminal: <Icon as={FaTerminal} />,
  tokyonight: <StarIcon />, // Stars for Tokyo Night
  nord: <Icon as={FaSnowflake} />, // Snowflake for Nordic theme
  dracula: <Icon as={FaDragon} />,
  solarized: <Icon as={TbBrandRadixUi} />,
  cyberpunk: <Icon as={FaRobot} />,
};

// Color accents for menu items
const getThemeAccent = (profile: ColorProfile): string => {
  const colors = getThemeColors(profile);
  if (colors) return colors.accent;
  if (profile === 'dark') return '#718096';
  return '#3182ce';
};

const ThemeToggle: React.FC = () => {
  const { colorProfile, setCustomTheme } = useCustomTheme();

  const currentTheme = THEME_OPTIONS.find(t => t.value === colorProfile);

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<ChevronDownIcon />}
        size="sm"
        variant="outline"
        leftIcon={themeIcons[colorProfile]}
      >
        {currentTheme?.label || 'Theme'}
      </MenuButton>
      <MenuList zIndex={1000}>
        {THEME_OPTIONS.map((theme) => (
          <MenuItem
            key={theme.value}
            onClick={() => setCustomTheme(theme.value)}
            bg={colorProfile === theme.value ? 'gray.100' : undefined}
            _dark={{ bg: colorProfile === theme.value ? 'gray.700' : undefined }}
          >
            <HStack spacing={3} w="full">
              <Box color={getThemeAccent(theme.value)}>
                {themeIcons[theme.value]}
              </Box>
              <Box flex={1}>
                <Text fontWeight={colorProfile === theme.value ? 'bold' : 'normal'}>
                  {theme.label}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {theme.description}
                </Text>
              </Box>
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};

export default ThemeToggle;
