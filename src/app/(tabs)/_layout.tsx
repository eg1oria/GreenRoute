import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/lib/modes';
import { useTheme } from '@/theme/useTheme';

// Выше стандартной: под иконкой-«пилюлей» должна помещаться подпись
const TAB_BAR_HEIGHT = 62;

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Маршрут', tabBarIcon: icon('navigate') }} />
      <Tabs.Screen name="goals" options={{ title: 'Цели', tabBarIcon: icon('flag') }} />
      <Tabs.Screen name="challenges" options={{ title: 'Челленджи', tabBarIcon: icon('people') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 52, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
