import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useStrings } from '@/i18n';
import { AppStoreProvider, useAppStore } from '@/store/AppStore';
import { SettingsProvider, useSettings } from '@/store/Settings';
import { useTheme } from '@/theme/useTheme';

// Сплэш держим, пока не прочитаны сохранённые настройки и данные
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const { hydrated: settingsHydrated, fontScale } = useSettings();
  const { hydrated: storeHydrated } = useAppStore();
  const s = useStrings();
  // Ждём сохранённые настройки и данные: иначе при запуске мигают тема устройства и цели по умолчанию
  const hydrated = settingsHydrated && storeHydrated;

  useEffect(() => {
    if (hydrated) SplashScreen.hide();
  }, [hydrated]);

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
        <Stack.Screen name="news/[id]" options={{ title: s.news.detailsTitle }} />
        <Stack.Screen name="trip-result" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
