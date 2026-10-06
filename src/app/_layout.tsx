import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';

import { AppStoreProvider } from '@/store/AppStore';
import { useTheme } from '@/theme/useTheme';

export default function RootLayout() {
  const t = useTheme();
  const base = t.dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, primary: t.primary, background: t.background, card: t.card, text: t.text, border: t.border },
  };

  return (
    <AppStoreProvider>
      <ThemeProvider value={navigationTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.background },
            headerTintColor: t.text,
            headerShadowVisible: false,
            headerBackTitle: 'Назад',
            contentStyle: { backgroundColor: t.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="challenge/[id]" options={{ title: 'Челлендж' }} />
          <Stack.Screen name="trip-result" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppStoreProvider>
  );
}
