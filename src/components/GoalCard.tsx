import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { formatMetric, METRIC_META } from '@/lib/metrics';
import type { IconName } from '@/lib/modes';
import { useTheme } from '@/theme/useTheme';
import type { Goal } from '@/types';

import { ProgressRing } from './ProgressRing';
import { Text } from './Text';

type Props = {
  goal: Goal;
  /** прогресс за текущую неделю в единицах цели */
  value: number;
  onAdjust: (direction: 1 | -1) => void;
  onRemove: () => void;
};

export function GoalCard({ goal, value, onAdjust, onRemove }: Props) {
  const t = useTheme();
  const s = useStrings();
  const meta = METRIC_META[goal.kind];
  const progress = value / goal.target;
  const done = progress >= 1;

  const control = (icon: IconName, label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[styles.control, { borderColor: t.border, backgroundColor: t.card }, disabled && styles.disabled]}>
      <Ionicons name={icon} size={18} color={t.text} />
    </Pressable>
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: done ? t.achievementSoft : t.card, borderColor: done ? t.achievement : t.border },
      ]}>
      <ProgressRing progress={progress} color={done ? t.achievement : t.accent}>
        {done ? (
          <Ionicons name="trophy" size={24} color={t.achievement} />
        ) : (
          <Text style={[styles.percent, { color: t.text }]}>{Math.floor(progress * 100)}%</Text>
        )}
      </ProgressRing>

      <View style={styles.main}>
        <View style={styles.titleRow}>
          <Ionicons name={meta.icon} size={16} color={t.textSecondary} />
          <Text style={[styles.title, { color: t.text }]}>{s.metric[goal.kind]}</Text>
        </View>
        <Text style={[styles.value, { color: t.textSecondary }]}>
          {done ? `${s.common.goalReached} · ` : ''}
          {s.common.outOf(formatMetric(s, goal.kind, value), formatMetric(s, goal.kind, goal.target))}
        </Text>
        <View style={styles.controls}>
          {control('remove', s.goals.decrease, () => onAdjust(-1), goal.target <= meta.min)}
          {control('add', s.goals.increase, () => onAdjust(1))}
          <View style={styles.spacer} />
          {control('trash-outline', s.goals.remove, onRemove)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  percent: { fontSize: 15, fontWeight: '700' },
  main: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  value: { fontSize: 14 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  control: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  spacer: { flex: 1 },
});
