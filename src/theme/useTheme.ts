import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/Settings';

import { darkTheme, lightTheme, type Theme } from './colors';

export function useTheme(): Theme {
  const system = useColorScheme();
  const { themeMode } = useSettings();
  const scheme = themeMode === 'system' ? system : themeMode;
  return scheme === 'dark' ? darkTheme : lightTheme;
}
