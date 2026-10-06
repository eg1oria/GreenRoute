import { StyleSheet, Text, View } from 'react-native';

import { LEVEL_LABEL, type FootprintLevel } from '@/lib/carbon';
import { useTheme } from '@/theme/useTheme';

export function FootprintBadge({ level }: { level: FootprintLevel }) {
  const t = useTheme();
  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: t.level[level] }]} />
      <Text style={[styles.label, { color: t.textSecondary }]}>{LEVEL_LABEL[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 13, fontWeight: '500' },
});
