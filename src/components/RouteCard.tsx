import { Pressable, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { footprintLevel } from '@/lib/carbon';
import { useTheme } from '@/theme/useTheme';
import type { RouteOption } from '@/types';

import { FootprintBadge } from './FootprintBadge';
import { ModeIcon } from './ModeIcon';
import { Text } from './Text';

type Props = {
  route: RouteOption;
  carCo2G: number;
  selected: boolean;
  recommended: boolean;
  onPress: () => void;
};

export function RouteCard({ route, carCo2G, selected, recommended, onPress }: Props) {
  const t = useTheme();
  const s = useStrings();
  const savedG = carCo2G - route.co2G;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: selected ? t.accentSoft : t.card, borderColor: selected ? t.accent : t.border },
      ]}>
      <View style={[styles.icon, { backgroundColor: t.mode[route.mode] }]}>
        <ModeIcon mode={route.mode} size={22} color="#FFFFFF" />
      </View>

      <View style={styles.main}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: t.text }]}>{s.mode[route.mode].label}</Text>
          {recommended && (
            <View style={[styles.tag, { backgroundColor: t.accent }]}>
              <Text style={[styles.tagText, { color: t.onAccent }]}>{s.route.recommended}</Text>
            </View>
          )}
          {route.estimated && <Text style={[styles.estimate, { color: t.textSecondary }]}>{s.route.estimate}</Text>}
        </View>
        <Text style={[styles.meta, { color: t.textSecondary }]}>
          {s.format.distance(route.distanceM)} · {s.format.co2(route.co2G)} CO₂
        </Text>
        {route.metroStations && (
          <Text style={[styles.meta, { color: t.textSecondary }]} numberOfLines={2}>
            {route.metroStations.map((id) => s.metroStation[id]).join(' → ')}
          </Text>
        )}
        <FootprintBadge level={footprintLevel(route.co2G, carCo2G)} />
      </View>

      <View style={styles.side}>
        <Text style={[styles.duration, { color: t.text }]}>{s.format.duration(route.durationS)}</Text>
        {route.mode !== 'car' && savedG > 0 && (
          <Text style={[styles.saved, { color: t.level.low }]}>−{s.format.co2(savedG)}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700' },
  estimate: { fontSize: 12 },
  meta: { fontSize: 14 },
  side: { alignItems: 'flex-end', gap: 4 },
  duration: { fontSize: 18, fontWeight: '700' },
  saved: { fontSize: 13, fontWeight: '600' },
});
