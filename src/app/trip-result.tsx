import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { Button, Card, ProgressBar, SectionTitle } from '@/components/ui';
import { useStrings } from '@/i18n';
import { equivalents } from '@/lib/carbon';
import { challengePeriod } from '@/lib/challenges';
import { formatMetric, metricValue, startOfWeek, sumMetric } from '@/lib/metrics';
import { useAppStore } from '@/store/AppStore';
import { CHALLENGES } from '@/store/seed';
import { useTheme } from '@/theme/useTheme';

export default function TripResultScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = useStrings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, goals, memberships } = useAppStore();

  const trip = trips.find((item) => item.id === id);
  if (!trip) {
    return (
      <View style={[styles.missing, { backgroundColor: t.background }]}>
        <Text style={{ color: t.textSecondary }}>{s.trip.notFound}</Text>
        <Button title={s.common.close} variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  const eco = trip.mode !== 'car';
  const { treeDays, phoneCharges } = equivalents(trip.savedG);
  const weekStart = startOfWeek().getTime();
  const tripTime = new Date(trip.date).getTime();

  const affectedGoals = goals.filter((goal) => metricValue(trip, goal.kind) > 0);
  const teamContributions = CHALLENGES.flatMap((challenge) => {
    const membership = memberships[challenge.id];
    const value = metricValue(trip, challenge.metric);
    if (!membership || value <= 0 || tripTime < new Date(membership.joinedAt).getTime()) return [];
    if (tripTime >= challengePeriod(challenge).end) return [];
    const team = challenge.teams.find((item) => item.id === membership.teamId);
    return team ? [{ challenge, team, value }] : [];
  });

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: eco ? t.achievement : t.border }]}>
            <Ionicons name={eco ? 'leaf' : 'car'} size={36} color={t.onAchievement} />
          </View>
          <Text style={[styles.heroLabel, { color: t.textSecondary }]}>
            {eco ? s.trip.saved : s.trip.footprint}
          </Text>
          <Text style={[styles.heroValue, { color: t.text }]}>
            {s.format.co2(eco ? trip.savedG : trip.co2G)} CO₂
          </Text>
          <Text style={[styles.heroMeta, { color: t.textSecondary }]}>
            {s.mode[trip.mode].how} · {s.format.distance(trip.distanceM)} · {s.format.duration(trip.durationS)}
          </Text>
        </View>

        {eco ? (
          // У короткой поездки экономия меньше суток работы дерева или одной зарядки — «0 дней» не показываем
          phoneCharges >= 1 && (
            <Card style={styles.equivalents}>
              {treeDays >= 1 && (
                <View style={styles.equivalent}>
                  <Ionicons name="leaf-outline" size={22} color={t.primary} />
                  <Text style={[styles.equivalentText, { color: t.text }]}>{s.trip.tree(treeDays)}</Text>
                </View>
              )}
              <View style={styles.equivalent}>
                <Ionicons name="phone-portrait-outline" size={22} color={t.primary} />
                <Text style={[styles.equivalentText, { color: t.text }]}>{s.trip.phone(phoneCharges)}</Text>
              </View>
              <Text style={[styles.footnote, { color: t.textSecondary }]}>{s.trip.comparisonNote}</Text>
            </Card>
          )
        ) : (
          <Card>
            <Text style={[styles.equivalentText, { color: t.text }]}>{s.trip.nextTime}</Text>
          </Card>
        )}

        {affectedGoals.length > 0 && <SectionTitle>{s.common.weekGoals}</SectionTitle>}
        {affectedGoals.map((goal) => {
          const value = sumMetric(trips, goal.kind, weekStart);
          const done = value >= goal.target;
          return (
            <Card key={goal.id} style={[styles.goal, done && { backgroundColor: t.achievementSoft, borderColor: t.achievement }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalTitle, { color: t.text }]}>{s.metric[goal.kind]}</Text>
                <Text style={[styles.goalDelta, { color: t.level.low }]}>
                  +{formatMetric(s, goal.kind, metricValue(trip, goal.kind))}
                </Text>
              </View>
              <ProgressBar progress={value / goal.target} color={done ? t.achievement : t.accent} />
              <Text style={[styles.footnote, { color: t.textSecondary }]}>
                {done ? `${s.common.goalReached} · ` : ''}
                {s.common.outOf(formatMetric(s, goal.kind, value), formatMetric(s, goal.kind, goal.target))}
              </Text>
            </Card>
          );
        })}

        {teamContributions.length > 0 && <SectionTitle>{s.trip.teamContribution}</SectionTitle>}
        {teamContributions.map(({ challenge, team, value }) => (
          <Card key={challenge.id} style={styles.contribution}>
            <View style={styles.contributionText}>
              <Text style={[styles.goalTitle, { color: t.text }]}>{s.team[team.id]}</Text>
              <Text style={[styles.footnote, { color: t.textSecondary }]}>{s.challengeText[challenge.id].title}</Text>
            </View>
            <Text style={[styles.goalDelta, { color: t.level.low }]}>+{formatMetric(s, challenge.metric, value)}</Text>
          </Card>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, borderTopColor: t.border }]}>
        <Button title={s.common.done} onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  heroLabel: { fontSize: 15 },
  heroValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  heroMeta: { fontSize: 14 },
  equivalents: { gap: 12 },
  equivalent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  equivalentText: { flex: 1, fontSize: 15, lineHeight: 21 },
  footnote: { fontSize: 13, lineHeight: 18 },
  goal: { gap: 10, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  goalTitle: { fontSize: 16, fontWeight: '700' },
  goalDelta: { fontSize: 15, fontWeight: '700' },
  contribution: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contributionText: { flex: 1, gap: 2 },
  footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
