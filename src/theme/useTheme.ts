import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type Theme } from './colors';

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
