import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStrings } from '@/i18n';
import type { IconName } from '@/lib/modes';
import { useSettings } from '@/store/Settings';
import { useTheme } from '@/theme/useTheme';

// Выше стандартной: под иконкой-«пилюлей» должна помещаться подпись
const TAB_BAR_HEIGHT = 62;
// С пятью вкладками на подпись остаётся ~65 pt ширины на телефоне 375 pt — отсюда размер 10 (как в iOS)
const TAB_LABEL_SIZE = 10;
// Подписи вкладок растут вместе со шрифтом только до этого предела — дальше «Челленджи» не помещается
const MAX_LABEL_SCALE = 1.05;

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useSettings();
  const s = useStrings();

  // Активная вкладка — мятная «пилюля» под иконкой; главный зелёный оставлен для ключевых действий
  const icon = (name: IconName) => {
    function TabIcon({ focused }: { focused: boolean }) {
      return (
        <View style={[styles.pill, focused && { backgroundColor: t.accent }]}>
          <Ionicons name={name} size={20} color={focused ? t.onAccent : t.textSecondary} />
        </View>
      );
    }
    return TabIcon;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: TAB_LABEL_SIZE * Math.min(fontScale, MAX_LABEL_SCALE), fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: s.tabs.route, tabBarIcon: icon('navigate') }} />
      <Tabs.Screen name="goals" options={{ title: s.tabs.goals, tabBarIcon: icon('flag') }} />
      <Tabs.Screen name="challenges" options={{ title: s.tabs.challenges, tabBarIcon: icon('people') }} />
      <Tabs.Screen name="news" options={{ title: s.tabs.news, tabBarIcon: icon('newspaper') }} />
      <Tabs.Screen name="settings" options={{ title: s.tabs.settings, tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 52, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
