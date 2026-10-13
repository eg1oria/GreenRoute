import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { useSettings } from '@/store/Settings';
import { useTheme } from '@/theme/useTheme';
import type { Mode, RouteOption } from '@/types';

import { Text } from './Text';
import { Card } from './ui';

type Metric = 'co2' | 'time';

const METRICS: Metric[] = ['co2', 'time'];

// Колонки подписей фиксированной ширины, чтобы полосы начинались на одной линии; растут вместе со шрифтом
const LABEL_WIDTH = 86;
const VALUE_WIDTH = 76;

export function CompareBars({ routes, selected }: { routes: RouteOption[]; selected: Mode | null }) {
  const t = useTheme();
  const s = useStrings();
  const { fontScale } = useSettings();
  const [metric, setMetric] = useState<Metric>('co2');

  const valueOf = (route: RouteOption) => (metric === 'co2' ? route.co2G : route.durationS);
  const max = Math.max(1, ...routes.map(valueOf));

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>{s.route.compare}</Text>
        <View style={[styles.segment, { backgroundColor: t.background, borderColor: t.border }]}>
          {METRICS.map((key) => {
            const active = key === metric;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMetric(key)}
                style={[styles.segmentItem, active && { backgroundColor: t.accent }]}>
                <Text style={[styles.segmentText, { color: active ? t.onAccent : t.textSecondary }]}>{key === 'co2' ? 'CO₂' : s.route.time}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {routes.map((route) => {
        const value = valueOf(route);
        const active = route.mode === selected;
        return (
          <View key={route.mode} style={styles.row}>
            <Text
              style={[
                styles.label,
                { width: LABEL_WIDTH * fontScale, color: active ? t.text : t.textSecondary },
                active && styles.bold,
              ]}>
              {s.mode[route.mode].label}
            </Text>
            <View style={styles.barArea}>
              <View
                style={[styles.bar, { width: `${(value / max) * 100}%`, backgroundColor: t.mode[route.mode] }]}
              />
            </View>
            <Text style={[styles.value, { width: VALUE_WIDTH * fontScale, color: t.text }, active && styles.bold]}>
              {metric === 'co2' ? s.format.co2(value) : s.format.duration(value)}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700' },
  segment: { flexDirection: 'row', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 2 },
  segmentItem: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  segmentText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14 },
  barArea: { flex: 1, height: 14, justifyContent: 'center' },
  bar: { height: 14, minWidth: 4, borderRadius: 7 },
  value: { textAlign: 'right', fontSize: 14 },
  bold: { fontWeight: '700' },
});
