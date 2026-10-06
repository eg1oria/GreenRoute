import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressBar, ScreenTitle } from '@/components/ui';
import { daysLeft, leaderboard } from '@/lib/challenges';
import { plural } from '@/lib/format';
import { formatMetric, METRIC_META } from '@/lib/metrics';
import { useAppStore } from '@/store/AppStore';
import { CHALLENGES } from '@/store/seed';
import { useTheme } from '@/theme/useTheme';

export default function ChallengesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trips, memberships } = useAppStore();

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <ScreenTitle title="Челленджи" subtitle="Командные экологические соревнования" />

      {CHALLENGES.map((challenge) => {
        const rows = leaderboard(challenge, memberships[challenge.id], trips);
        const mine = rows.find((row) => row.isMine);
        const days = daysLeft(challenge);

        return (
          <Pressable
            key={challenge.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } })}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: t.card, borderColor: mine ? t.accent : t.border },
              pressed && styles.pressed,
            ]}>
            <View style={styles.header}>
              <View style={[styles.icon, { backgroundColor: t.achievement }]}>
                <Ionicons name={METRIC_META[challenge.metric].icon} size={20} color={t.onAchievement} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: t.text }]}>{challenge.title}</Text>
                <Text style={[styles.meta, { color: t.textSecondary }]}>
                  {challenge.teams.length} {plural(challenge.teams.length, ['команда', 'команды', 'команд'])} · осталось{' '}
                  {days} {plural(days, ['день', 'дня', 'дней'])}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.textSecondary} />
            </View>

            <Text style={[styles.description, { color: t.textSecondary }]}>{challenge.description}</Text>

            {mine ? (
              <View style={styles.progress}>
                <View style={styles.progressRow}>
                  <Text style={[styles.team, { color: t.text }]}>
                    {mine.team.name} · {mine.rank} место
                  </Text>
                  <Text style={[styles.meta, { color: t.textSecondary }]}>
                    {formatMetric(challenge.metric, mine.score)} из {formatMetric(challenge.metric, challenge.target)}
                  </Text>
                </View>
                <ProgressBar progress={mine.score / challenge.target} color={t.accent} />
              </View>
            ) : (
              <View style={[styles.join, { backgroundColor: t.accent }]}>
                <Text style={[styles.joinText, { color: t.onAccent }]}>Выбрать команду</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      <Text style={[styles.note, { color: t.textSecondary }]}>
        Команды и их результаты — демонстрационные. Ваш вклад считается по записанным поездкам.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  pressed: { opacity: 0.8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13 },
  description: { fontSize: 14, lineHeight: 20 },
  progress: { gap: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  team: { flex: 1, fontSize: 14, fontWeight: '600' },
  join: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  joinText: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});
