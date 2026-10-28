import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { Button, Card } from '@/components/ui';
import { useStrings } from '@/i18n';
import type { IconName } from '@/lib/modes';
import { checkFutureDate } from '@/lib/validation';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme/useTheme';
import type { Task } from '@/types/task';

// Срок хранится как ГГГГ-ММ-ДД, поэтому строки сравниваются в том же порядке, что и даты.
// При одинаковом сроке выше задача с высоким приоритетом, затем — добавленная раньше.
function byDeadline(a: Task, b: Task): number {
  return (
    a.deadline.localeCompare(b.deadline) ||
    Number(b.priority === 'high') - Number(a.priority === 'high') ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

export default function TasksScreen() {
  const t = useTheme();
  const s = useStrings();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tasks, removeTask } = useAppStore();

  const sorted = useMemo(() => [...tasks].sort(byDeadline), [tasks]);

  const tag = (icon: IconName, label: string, color = t.textSecondary) => (
    <View style={styles.tag}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.actions}>
        <Button title={s.tasks.newTask} icon="add" onPress={() => router.push('/new-task')} style={styles.flex} />
        <Button
          title={s.tasks.newEvent}
          icon="calendar-outline"
          variant="outline"
          onPress={() => router.push('/new-event')}
          style={styles.flex}
        />
      </View>

      {sorted.length === 0 ? (
        <Text style={[styles.empty, { color: t.textSecondary }]}>{s.tasks.empty}</Text>
      ) : (
        <>
          <Text style={[styles.sorted, { color: t.textSecondary }]}>{s.tasks.sorted}</Text>
          {sorted.map((task) => {
            const overdue = checkFutureDate(task.deadline) === 'past';
            return (
              <Card key={task.id} style={styles.task}>
                <View style={styles.header}>
                  <View style={styles.flex}>
                    <Text style={[styles.title, { color: t.text }]}>{task.title}</Text>
                    <Text style={[styles.subject, { color: t.textSecondary }]}>{task.subject}</Text>
                  </View>
                  {task.priority === 'high' && (
                    <View style={[styles.badge, { backgroundColor: t.achievementSoft }]}>
                      <Ionicons name="flame" size={14} color={t.text} />
                      <Text style={[styles.badgeText, { color: t.text }]}>{s.tasks.priority.high}</Text>
                    </View>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={s.tasks.remove}
                    onPress={() => removeTask(task.id)}
                    hitSlop={10}>
                    <Ionicons name="close" size={20} color={t.textSecondary} />
                  </Pressable>
                </View>
                <Text style={[styles.description, { color: t.text }]} numberOfLines={3}>
                  {task.description}
                </Text>
                <View style={styles.tags}>
                  {tag(
                    'calendar-outline',
                    `${s.tasks.deadline(s.format.day(task.deadline))}${overdue ? ` · ${s.tasks.overdue}` : ''}`,
                    overdue ? t.danger : t.textSecondary,
                  )}
                  {tag('pricetag-outline', s.tasks.category[task.category])}
                  {tag('barbell-outline', s.tasks.effort(task.effort))}
                  {task.reminder && tag('notifications-outline', s.tasks.reminder)}
                </View>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  empty: { fontSize: 15, lineHeight: 21, marginTop: 8 },
  sorted: { fontSize: 13, marginTop: 4 },
  task: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 17, fontWeight: '700' },
  subject: { fontSize: 14, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontSize: 13 },
});
