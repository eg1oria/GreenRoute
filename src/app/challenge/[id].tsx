import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { Button, Card, ProgressBar, SectionTitle } from '@/components/ui';
import { useStrings } from '@/i18n';
import { daysLeft, leaderboard, myContribution } from '@/lib/challenges';
import { formatMetric } from '@/lib/metrics';
import { useAppStore } from '@/store/AppStore';
import { CHALLENGES } from '@/store/seed';
import { useSettings } from '@/store/Settings';
import { useTheme } from '@/theme/useTheme';

export default function ChallengeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useSettings();
  const s = useStrings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, memberships, joinTeam, leaveChallenge } = useAppStore();
  const [picked, setPicked] = useState<string | null>(null);

  const challenge = CHALLENGES.find((item) => item.id === id);
  if (!challenge) {
    return (
      <View style={styles.missing}>
        <Text style={{ color: t.textSecondary }}>{s.challenge.notFound}</Text>
      </View>
    );
  }

  const membership = memberships[challenge.id];
  const rows = leaderboard(challenge, membership, trips);
  const maxScore = Math.max(challenge.target, ...rows.map((row) => row.score));
  const days = daysLeft(challenge);

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: t.text }]}>{s.challengeText[challenge.id].title}</Text>
        <Text style={[styles.description, { color: t.textSecondary }]}>{s.challengeText[challenge.id].description}</Text>

        <Card style={styles.facts}>
          <View style={styles.fact}>
            <Text style={[styles.factValue, { color: t.text }]}>{formatMetric(s, challenge.metric, challenge.target)}</Text>
            <Text style={[styles.factLabel, { color: t.textSecondary }]}>{s.challenge.teamGoal}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={[styles.factValue, { color: t.text }]}>{s.count.days(days)}</Text>
            <Text style={[styles.factLabel, { color: t.textSecondary }]}>{s.challenge.left}</Text>
          </View>
          {membership && (
            <View style={styles.fact}>
              <Text style={[styles.factValue, { color: t.text }]}>
                {formatMetric(s, challenge.metric, myContribution(challenge, membership, trips))}
              </Text>
              <Text style={[styles.factLabel, { color: t.textSecondary }]}>{s.challenge.yourShare}</Text>
            </View>
          )}
        </Card>

        <SectionTitle>{membership ? s.challenge.ranking : s.challenge.chooseTeam}</SectionTitle>

        {rows.map((row) => {
          const highlighted = row.isMine || (!membership && row.team.id === picked);
          const done = row.score >= challenge.target;
          return (
            <Pressable
              key={row.team.id}
              accessibilityRole={membership ? 'none' : 'radio'}
              accessibilityState={{ selected: highlighted }}
              disabled={!!membership}
              onPress={() => setPicked(row.team.id)}
              style={[
                styles.row,
                { backgroundColor: highlighted ? t.accentSoft : t.card, borderColor: highlighted ? t.accent : t.border },
              ]}>
              <Text style={[styles.rank, { width: 20 * fontScale, color: t.textSecondary }]}>{row.rank}</Text>
              <View style={styles.rowMain}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.teamName, { color: t.text }]} numberOfLines={1}>
                    {s.team[row.team.id]}
                    {row.isMine ? ` · ${s.challenge.you}` : ''}
                  </Text>
                  <Text style={[styles.score, { color: t.text }]}>{formatMetric(s, challenge.metric, row.score)}</Text>
                </View>
                <ProgressBar progress={row.score / maxScore} color={done ? t.achievement : t.accent} />
                <Text style={[styles.members, { color: t.textSecondary }]}>
                  {s.count.members(row.team.members)}
                  {done ? ` · ${s.challenge.goalReached}` : ''}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {membership && (
          <Pressable accessibilityRole="button" onPress={() => leaveChallenge(challenge.id)} style={styles.leave}>
            <Text style={[styles.leaveText, { color: t.level.high }]}>{s.challenge.leave}</Text>
          </Pressable>
        )}
      </ScrollView>

      {!membership && (
        <View
          style={[
            styles.footer,
            { backgroundColor: t.background, borderTopColor: t.border, paddingBottom: insets.bottom + 10 },
          ]}>
          <Button
            title={picked ? s.challenge.join : s.challenge.chooseTeam}
            disabled={!picked}
            onPress={() => picked && joinTeam(challenge.id, picked)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  description: { fontSize: 15, lineHeight: 21 },
  facts: { flexDirection: 'row', gap: 12 },
  fact: { flex: 1, gap: 2 },
  factValue: { fontSize: 17, fontWeight: '700' },
  factLabel: { fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 14 },
  rank: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  rowMain: { flex: 1, gap: 8 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  teamName: { flex: 1, fontSize: 16, fontWeight: '700' },
  score: { fontSize: 15, fontWeight: '600' },
  members: { fontSize: 13 },
  leave: { alignSelf: 'center', padding: 12 },
  leaveText: { fontSize: 15, fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
