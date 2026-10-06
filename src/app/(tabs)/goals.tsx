import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalCard } from '@/components/GoalCard';
import { Card, ScreenTitle, SectionTitle } from '@/components/ui';
import { equivalents } from '@/lib/carbon';
import { formatCo2, formatDate, formatDistance, plural } from '@/lib/format';
import { formatMetric, METRIC_KINDS, METRIC_META, startOfWeek, sumMetric } from '@/lib/metrics';
import { MODE_META } from '@/lib/modes';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme/useTheme';

const HISTORY_LIMIT = 20;

export default function GoalsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { trips, goals, addGoal, removeGoal, adjustGoal, removeTrip } = useAppStore();

  const weekStart = startOfWeek().getTime();
  const totalSavedG = sumMetric(trips, 'co2') * 1000;
  const { treeDays } = equivalents(totalSavedG);
  const missingKinds = METRIC_KINDS.filter((kind) => !goals.some((goal) => goal.kind === kind));

  const stat = (value: string, label: string) => (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: t.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: t.textSecondary }]}>{label}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <ScreenTitle title="Цели" subtitle="Ваш экологический эффект и цели на неделю" />

      <Card style={styles.summary}>
        <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>Сэкономлено CO₂ за всё время</Text>
        <Text style={[styles.summaryValue, { color: t.text }]}>{formatCo2(totalSavedG)}</Text>
        <Text style={[styles.summaryHint, { color: t.textSecondary }]}>
          {trips.length === 0
            ? 'Запишите первую поездку — и здесь появится ваш вклад'
            : treeDays >= 1
              ? `Столько одно дерево поглощает за ${treeDays} ${plural(treeDays, ['день', 'дня', 'дней'])}`
              : 'По сравнению с теми же поездками на авто'}
        </Text>
        <View style={[styles.stats, { borderTopColor: t.border }]}>
          {stat(formatCo2(sumMetric(trips, 'co2', weekStart) * 1000), 'CO₂ за неделю')}
          {stat(formatMetric('activeKm', sumMetric(trips, 'activeKm', weekStart)), 'активно')}
          {stat(String(sumMetric(trips, 'trips', weekStart)), 'эко-поездок')}
        </View>
      </Card>

      <SectionTitle>Цели на неделю</SectionTitle>
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          value={sumMetric(trips, goal.kind, weekStart)}
          onAdjust={(direction) => adjustGoal(goal.id, direction)}
          onRemove={() => removeGoal(goal.id)}
        />
      ))}
      {missingKinds.map((kind) => (
        <Pressable
          key={kind}
          accessibilityRole="button"
          onPress={() => addGoal(kind)}
          style={[styles.addGoal, { borderColor: t.border }]}>
          <Ionicons name="add-circle-outline" size={20} color={t.primary} />
          <Text style={[styles.addGoalText, { color: t.text }]}>Добавить цель «{METRIC_META[kind].title}»</Text>
        </Pressable>
      ))}

      <SectionTitle>История поездок</SectionTitle>
      {trips.length === 0 ? (
        <Text style={[styles.empty, { color: t.textSecondary }]}>
          Пока пусто. Постройте маршрут на вкладке «Маршрут» и запишите поездку.
        </Text>
      ) : (
        <Card style={styles.history}>
          {trips.slice(0, HISTORY_LIMIT).map((trip, i) => (
            <View key={trip.id} style={[styles.trip, i > 0 && { borderTopColor: t.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.tripIcon, { backgroundColor: t.mode[trip.mode] }]}>
                <Ionicons name={MODE_META[trip.mode].icon} size={18} color="#FFFFFF" />
              </View>
              <View style={styles.tripMain}>
                <Text style={[styles.tripTitle, { color: t.text }]} numberOfLines={2}>
                  {trip.fromName} → {trip.toName}
                </Text>
                <Text style={[styles.tripMeta, { color: t.textSecondary }]}>
                  {formatDate(trip.date)} · {formatDistance(trip.distanceM)}
                </Text>
              </View>
              <Text style={[styles.tripSaved, { color: trip.savedG > 0 ? t.level.low : t.textSecondary }]}>
                {trip.savedG > 0 ? `−${formatCo2(trip.savedG)}` : `+${formatCo2(trip.co2G)}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Удалить поездку"
                onPress={() => removeTrip(trip.id)}
                hitSlop={10}>
                <Ionicons name="close" size={18} color={t.textSecondary} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  summary: { gap: 4 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  summaryHint: { fontSize: 14, lineHeight: 19 },
  stats: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  addGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
  },
  addGoalText: { flex: 1, fontSize: 15, fontWeight: '500' },
  empty: { fontSize: 15, lineHeight: 21 },
  history: { paddingVertical: 4 },
  trip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  tripIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tripMain: { flex: 1, gap: 2 },
  tripTitle: { fontSize: 15, fontWeight: '600' },
  tripMeta: { fontSize: 13 },
  tripSaved: { fontSize: 14, fontWeight: '700' },
});
