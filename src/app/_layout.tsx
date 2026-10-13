import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';

import { useStrings } from '@/i18n';
import { AppStoreProvider } from '@/store/AppStore';
import { SettingsProvider, useSettings } from '@/store/Settings';
import { useTheme } from '@/theme/useTheme';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <AppStoreProvider>
        <RootNavigator />
      </AppStoreProvider>
    </SettingsProvider>
  );
}

function RootNavigator() {
  const t = useTheme();
  const { hydrated, fontScale } = useSettings();
  const s = useStrings();

  // Ждём сохранённые настройки, чтобы при запуске не мигала тема устройства вместо выбранной
  if (!hydrated) return null;

  const base = t.dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, primary: t.primary, background: t.background, card: t.card, text: t.text, border: t.border },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.background },
          headerTintColor: t.text,
          headerTitleStyle: { fontSize: 17 * fontScale },
          headerShadowVisible: false,
          headerBackTitle: s.common.back,
          contentStyle: { backgroundColor: t.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="challenge/[id]" options={{ title: s.challenge.screenTitle }} />
        <Stack.Screen name="trip-result" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
