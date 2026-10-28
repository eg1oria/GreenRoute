import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalCard } from '@/components/GoalCard';
import { ModeIcon } from '@/components/ModeIcon';
import { Text } from '@/components/Text';
import { Card, ScreenTitle, SectionTitle } from '@/components/ui';
import { useStrings } from '@/i18n';
import { equivalents } from '@/lib/carbon';
import { formatMetric, METRIC_KINDS, startOfWeek, sumMetric } from '@/lib/metrics';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme/useTheme';

const HISTORY_LIMIT = 20;

export default function GoalsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStrings();
  const { trips, goals, tasks, addGoal, removeGoal, adjustGoal, removeTrip } = useAppStore();

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
      <ScreenTitle title={s.goals.title} subtitle={s.goals.subtitle} />

      <Card style={styles.summary}>
        <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>{s.goals.savedAllTime}</Text>
        <Text style={[styles.summaryValue, { color: t.text }]}>{s.format.co2(totalSavedG)}</Text>
        <Text style={[styles.summaryHint, { color: t.textSecondary }]}>
          {trips.length === 0
            ? s.goals.emptyHint
            : treeDays >= 1
              ? s.goals.treeHint(treeDays)
              : s.goals.vsCar}
        </Text>
        <View style={[styles.stats, { borderTopColor: t.border }]}>
          {stat(s.format.co2(sumMetric(trips, 'co2', weekStart) * 1000), s.goals.statCo2Week)}
          {stat(formatMetric(s, 'activeKm', sumMetric(trips, 'activeKm', weekStart)), s.goals.statActive)}
          {stat(String(sumMetric(trips, 'trips', weekStart)), s.goals.statTrips)}
        </View>
      </Card>

      <Link href="/tasks" asChild>
        <Pressable accessibilityRole="link">
          {({ pressed }) => (
            <Card style={[styles.tasksLink, pressed && styles.pressed]}>
              <View style={[styles.tasksIcon, { backgroundColor: t.accentSoft }]}>
                <Ionicons name="school-outline" size={20} color={t.primary} />
              </View>
              <View style={styles.tasksMain}>
                <Text style={[styles.tasksTitle, { color: t.text }]}>{s.tasks.title}</Text>
                <Text style={[styles.tasksHint, { color: t.textSecondary }]}>{s.tasks.entryHint(tasks.length)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textSecondary} />
            </Card>
          )}
        </Pressable>
      </Link>

      <SectionTitle>{s.common.weekGoals}</SectionTitle>
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
          <Text style={[styles.addGoalText, { color: t.text }]}>{s.goals.addGoal(s.metric[kind])}</Text>
        </Pressable>
      ))}

      <SectionTitle>{s.goals.history}</SectionTitle>
      {trips.length === 0 ? (
        <Text style={[styles.empty, { color: t.textSecondary }]}>
          {s.goals.historyEmpty}
        </Text>
      ) : (
        <Card style={styles.history}>
          {trips.slice(0, HISTORY_LIMIT).map((trip, i) => (
            <View key={trip.id} style={[styles.trip, i > 0 && { borderTopColor: t.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.tripIcon, { backgroundColor: t.mode[trip.mode] }]}>
                <ModeIcon mode={trip.mode} size={18} color="#FFFFFF" />
              </View>
              <View style={styles.tripMain}>
                <Text style={[styles.tripTitle, { color: t.text }]} numberOfLines={2}>
                  {trip.fromName} → {trip.toName}
                </Text>
                <Text style={[styles.tripMeta, { color: t.textSecondary }]}>
                  {s.format.date(trip.date)} · {s.format.distance(trip.distanceM)}
                </Text>
              </View>
              <Text style={[styles.tripSaved, { color: trip.savedG > 0 ? t.level.low : t.textSecondary }]}>
                {trip.savedG > 0 ? `−${s.format.co2(trip.savedG)}` : `+${s.format.co2(trip.co2G)}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={s.goals.deleteTrip}
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
  tasksLink: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.6 },
  tasksIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tasksMain: { flex: 1, gap: 2 },
  tasksTitle: { fontSize: 16, fontWeight: '700' },
  tasksHint: { fontSize: 13 },
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
