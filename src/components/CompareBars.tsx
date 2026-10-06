import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCo2, formatDuration } from '@/lib/format';
import { MODE_META } from '@/lib/modes';
import { useTheme } from '@/theme/useTheme';
import type { Mode, RouteOption } from '@/types';

import { Card } from './ui';

type Metric = 'co2' | 'time';

const METRICS: { key: Metric; label: string }[] = [
  { key: 'co2', label: 'CO₂' },
  { key: 'time', label: 'Время' },
];

export function CompareBars({ routes, selected }: { routes: RouteOption[]; selected: Mode | null }) {
  const t = useTheme();
  const [metric, setMetric] = useState<Metric>('co2');

  const valueOf = (route: RouteOption) => (metric === 'co2' ? route.co2G : route.durationS);
  const max = Math.max(1, ...routes.map(valueOf));

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>Сравнение</Text>
        <View style={[styles.segment, { backgroundColor: t.background, borderColor: t.border }]}>
          {METRICS.map(({ key, label }) => {
            const active = key === metric;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setMetric(key)}
                style={[styles.segmentItem, active && { backgroundColor: t.accent }]}>
                <Text style={[styles.segmentText, { color: active ? t.onAccent : t.textSecondary }]}>{label}</Text>
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
            <Text style={[styles.label, { color: active ? t.text : t.textSecondary }, active && styles.bold]}>
              {MODE_META[route.mode].label}
            </Text>
            <View style={styles.barArea}>
              <View
                style={[styles.bar, { width: `${(value / max) * 100}%`, backgroundColor: t.mode[route.mode] }]}
              />
            </View>
            <Text style={[styles.value, { color: t.text }, active && styles.bold]}>
              {metric === 'co2' ? formatCo2(value) : formatDuration(value)}
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
  label: { width: 86, fontSize: 14 },
  barArea: { flex: 1, height: 14, justifyContent: 'center' },
  bar: { height: 14, minWidth: 4, borderRadius: 7 },
  value: { width: 76, textAlign: 'right', fontSize: 14 },
  bold: { fontWeight: '700' },
});
