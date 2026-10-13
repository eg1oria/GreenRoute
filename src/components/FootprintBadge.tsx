import { StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import type { FootprintLevel } from '@/lib/carbon';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

export function FootprintBadge({ level }: { level: FootprintLevel }) {
  const t = useTheme();
  const s = useStrings();
  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: t.level[level] }]} />
      <Text style={[styles.label, { color: t.textSecondary }]}>{s.level[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 13, fontWeight: '500' },
});
